const authRoutes = require("express").Router();

authRoutes.use("/me", require("./me"));

authRoutes.use("/weather-info", require("./weatherInfo"));

authRoutes.use("/shayari-quotes", require("./shayariAndQuotes"));

authRoutes.use("/birthday-reminder", require("./birthdayReminders"));

authRoutes.use("/background-images", require("./backgroundImages"));

authRoutes.use("/favorite-links", require("./favoriteLinks"));

module.exports = authRoutes;
