"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.music = void 0;
const music = (req, res, next) => {
    if (req.headers["x-api-key"] !== process.env.PERSONAL_API_KEY) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};
exports.music = music;
