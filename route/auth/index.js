const authRoutes = require("express").Router();

authRoutes.use("/me", require("./me"));

authRoutes.use("/temperature", require("./temperature"));

authRoutes.use("/quote-of-the-day", require("./quoteOfTheDay"));

authRoutes.use("/birthday-reminder", require("./birthdayReminders"));

authRoutes.use("/background-images", require("./backgroundImages"));

module.exports = authRoutes;
