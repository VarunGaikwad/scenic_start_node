import { Router } from "express";
import { music } from "../../middleware";
import loginRouter from "./login";
import registerRouter from "./register";
import emailExistsRouter from "./emailExists";
import logoutRouter from "./logout";
import translationRouter from "./translation";
import musicTrackerRouter from "./musicTracker";
import trainScheduleRouter from "./trainSchedule";
import favoriteIconRouter from "./favoriteIcons";

const unauthRoutes = Router();

unauthRoutes.use("/login", loginRouter);
unauthRoutes.use("/register", registerRouter);
unauthRoutes.use("/email-exists", emailExistsRouter);
unauthRoutes.use("/logout", logoutRouter);
unauthRoutes.use("/translation", translationRouter);
unauthRoutes.use("/music-tracker", music, musicTrackerRouter);
unauthRoutes.use("/train-schedule", trainScheduleRouter);
unauthRoutes.use("/favorite-icon", favoriteIconRouter);

export default unauthRoutes;
