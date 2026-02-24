import { Router } from "express";
import meRouter from "./me";
import weatherInfoRouter from "./weatherInfo";
import shayariAndQuotesRouter from "./shayariAndQuotes";
import backgroundImagesRouter from "./backgroundImages";
import bookmarksRouter from "./bookmarks";
import calenderRemindersRouter from "./calenderReminders";
import favoriteIconsRouter from "./favoriteIcons";

const authRoutes = Router();

authRoutes.use("/me", meRouter);
authRoutes.use("/weather-info", weatherInfoRouter);
authRoutes.use("/shayari-quotes", shayariAndQuotesRouter);
authRoutes.use("/background-images", backgroundImagesRouter);
authRoutes.use("/bookmark", bookmarksRouter);
authRoutes.use("/calender-reminder", calenderRemindersRouter);
authRoutes.use("/favorite-icon", favoriteIconsRouter);

export default authRoutes;
