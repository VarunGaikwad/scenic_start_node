const authRoutes = require("express").Router();

authRoutes.use("/me", require("./me"));

authRoutes.use("/temperature", require("./temperature"));

authRoutes.use("/favorite-links", require("./favoriteLinks"));

authRoutes.use("/motivation", require("./motivationQuotes"));

authRoutes.use("/birthday-reminder", require("./birthdayReminders"));

authRoutes.use("/todays-events", require("./todaysEvents"));

module.exports = authRoutes;
