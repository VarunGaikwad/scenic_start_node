import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth";

export function admin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ message: "Unauthenticated" });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  next();
}
