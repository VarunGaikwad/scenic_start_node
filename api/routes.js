const { auth } = require("../middleware");

const apiRoutes = require("express").Router();

apiRoutes.use("/unauth", require("./unauth"));

apiRoutes.use("/auth", auth, require("./auth"));

module.exports = apiRoutes;
