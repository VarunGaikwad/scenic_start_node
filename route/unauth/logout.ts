import { Router, Request, Response } from "express";

const logoutRouter = Router();

logoutRouter.post("/", (_req: Request, res: Response) => {
  res.clearCookie("ACCESS_TOKEN", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

export default logoutRouter;
