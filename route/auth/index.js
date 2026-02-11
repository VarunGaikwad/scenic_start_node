const authRoutes = require("express").Router();

authRoutes.use("/me", require("./me"));

authRoutes.use("/weather-info", require("./weatherInfo"));

authRoutes.use("/shayari-quotes", require("./shayariAndQuotes"));

authRoutes.use("/background-images", require("./backgroundImages"));

authRoutes.use("/bookmark", require("./bookmarks"));

authRoutes.use("/calender-reminder", require("./calenderReminders"));

authRoutes.use("/favorite-icon", require("./favoriteIcons"));

module.exports = authRoutes;
