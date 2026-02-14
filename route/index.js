const { auth, admin } = require("../middleware");
const apiRouters = require("express").Router();

apiRouters.use("/unauth", require("./unauth"));
apiRouters.use("/auth", auth, require("./auth"));
apiRouters.use("/admin", auth, admin, require("./admin"));

module.exports = apiRouters;
