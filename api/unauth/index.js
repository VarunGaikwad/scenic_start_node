const unauthRoutes = require("express").Router();

unauthRoutes.use("/login", require("./login"));

unauthRoutes.use("/register", require("./register"));

unauthRoutes.use("/forgot-password", require("./forgetPassword"));

module.exports = unauthRoutes;
