const jwt = require("jsonwebtoken");

const REQUIRED_ENVS = ["JWT_SECRET", "JWT_ISSUER", "JWT_AUDIENCE"];

for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    throw new Error(`${key} is not set`);
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

function auth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing authorization token" });
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
      clockTolerance: 5,
    });

    if (!payload.sub) {
      throw new Error("Token missing subject");
    }

    req.user = {
      id: payload.sub,
      email: payload.email?.toLowerCase() ?? null,
      role: payload.role ?? "user",
    };

    next();
  } catch (err) {
    console.warn("Auth failed:", err.message);
    debugger;
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { auth };
