"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../../db");
const rateLimiter_1 = require("../../middleware/rateLimiter");
const loginRouter = (0, express_1.Router)();
loginRouter.post("/", rateLimiter_1.loginLimiter, async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Email and password required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    try {
        const db = await (0, db_1.connectDB)();
        const user = await db.collection("users").findOne({
            email: normalizedEmail,
        });
        if (!user || user.status !== "active") {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        const isMatch = await bcrypt_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid credentials" });
        }
        await db
            .collection("users")
            .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
        const token = jsonwebtoken_1.default.sign({
            sub: user._id.toString(),
            email: user.email,
            role: user.role ?? "user",
        }, process.env.JWT_SECRET, {
            algorithm: "HS256",
            issuer: process.env.JWT_ISSUER,
            audience: process.env.JWT_AUDIENCE,
        });
        res.cookie("ACCESS_TOKEN", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 10),
        });
        return res.status(200).json({
            user: {
                id: user._id.toString(),
                email: user.email,
                role: user.role ?? "user",
            },
        });
    }
    catch (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.default = loginRouter;
