import { Request, Response, NextFunction } from "express";

export const music = (req: Request, res: Response, next: NextFunction) => {
  if (req.headers["x-api-key"] !== process.env.PERSONAL_API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};
