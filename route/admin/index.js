const adminRouter = require("express").Router();

adminRouter.use("/users", require("./users"));
adminRouter.use("/bookmarks", require("./bookmarks"));
adminRouter.use("/shayari-quotes", require("./shayariQuotes"));
adminRouter.use("/background-images", require("./backgroundImages"));
adminRouter.use("/calendar-reminders", require("./calendarReminders"));

module.exports = adminRouter;
