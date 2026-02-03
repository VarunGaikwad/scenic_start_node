const { auth } = require("../middleware");
const apiRouters = require("express").Router();

apiRouters.use("/unauth", require("./unauth"));
// apiRouters.use("/auth", auth, require("./auth"));

module.exports = apiRouters;
