const jwt = require("jsonwebtoken");

const REQUIRED_ENVS = [
  "JWT_SECRET",
  "JWT_ISSUER",
  "JWT_AUDIENCE",
  "EXCEPTION_URL",
];

for (const key of REQUIRED_ENVS) {
  if (!process.env[key]) {
    throw new Error(`${key} is not set`);
  }
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;
const EXCEPTION_URL = process.env.EXCEPTION_URL;

function auth(req, res, next) {
  const token = req.cookies?.accessToken;

  if (!token) {
    if (
      EXCEPTION_URL.split(";").some((url) => req.originalUrl.startsWith(url))
    ) {
      req.user = { new_user: true };
      return next();
    }

    return res.status(401).json({ message: "Missing authorization token" });
  }

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
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = { auth };
