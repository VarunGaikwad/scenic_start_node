const logoutRouter = require("express").Router();

logoutRouter.post("/", (req, res) => {
  res.clearCookie("ACCESS_TOKEN", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });

  return res.status(200).json({ message: "Logged out successfully" });
});

module.exports = logoutRouter;
