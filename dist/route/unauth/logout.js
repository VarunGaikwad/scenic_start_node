"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logoutRouter = (0, express_1.Router)();
logoutRouter.post("/", (_req, res) => {
    res.clearCookie("ACCESS_TOKEN", {
        httpOnly: true,
        secure: true,
        sameSite: "none",
    });
    return res.status(200).json({ message: "Logged out successfully" });
});
exports.default = logoutRouter;
