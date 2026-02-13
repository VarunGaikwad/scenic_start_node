const unauthRoutes = require("express").Router();

unauthRoutes.use("/login", require("./login"));

unauthRoutes.use("/register", require("./register"));

unauthRoutes.use("/email-exists", require("./emailExists"));

unauthRoutes.use("/logout", require("./logout"));

// unauthRoutes.use("/translation", require("./translation"));

module.exports = unauthRoutes;
