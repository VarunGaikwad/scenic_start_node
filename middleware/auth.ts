import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

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

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_ISSUER = process.env.JWT_ISSUER!;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE!;
const EXCEPTION_URL = process.env.EXCEPTION_URL!;

export interface AuthRequest extends Request {
  user?: {
    id?: string;
    email?: string | null;
    role?: string;
    new_user?: boolean;
  };
}

export function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.cookies?.ACCESS_TOKEN;

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
    }) as any;

    if (!payload.sub) {
      throw new Error("Token missing subject");
    }

    req.user = {
      id: payload.sub,
      email: payload.email?.toLowerCase() ?? null,
      role: payload.role ?? "user",
    };

    next();
  } catch (err: any) {
    console.warn("Auth failed:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}
