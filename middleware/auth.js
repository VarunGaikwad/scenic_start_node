const jwt = require("jsonwebtoken");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}

if (!process.env.ADMIN_EMAIL) {
  throw new Error("ADMIN_EMAIL is not set");
}

function auth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.slice(7); // remove "Bearer "

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"],
    });

    const email = payload.email?.toLowerCase();

    req.user = {
      id: payload.sub,
      email,
      is_admin: email === process.env.ADMIN_EMAIL.toLowerCase(),
      iat: payload.iat,
      exp: payload.exp,
    };

    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { auth };
