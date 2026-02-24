"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_1 = __importDefault(require("./users"));
const bookmarks_1 = __importDefault(require("./bookmarks"));
const shayariQuotes_1 = __importDefault(require("./shayariQuotes"));
const backgroundImages_1 = __importDefault(require("./backgroundImages"));
const calendarReminders_1 = __importDefault(require("./calendarReminders"));
const adminRouter = (0, express_1.Router)();
adminRouter.use("/users", users_1.default);
adminRouter.use("/bookmarks", bookmarks_1.default);
adminRouter.use("/shayari-quotes", shayariQuotes_1.default);
adminRouter.use("/background-images", backgroundImages_1.default);
adminRouter.use("/calendar-reminders", calendarReminders_1.default);
exports.default = adminRouter;
