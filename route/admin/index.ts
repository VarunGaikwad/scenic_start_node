import { Router } from "express";
import usersRouter from "./users";
import bookmarksRouter from "./bookmarks";
import shayariQuotesRouter from "./shayariQuotes";
import backgroundImagesRouter from "./backgroundImages";
import calendarRemindersRouter from "./calendarReminders";

const adminRouter = Router();

adminRouter.use("/users", usersRouter);
adminRouter.use("/bookmarks", bookmarksRouter);
adminRouter.use("/shayari-quotes", shayariQuotesRouter);
adminRouter.use("/background-images", backgroundImagesRouter);
adminRouter.use("/calendar-reminders", calendarRemindersRouter);

export default adminRouter;
