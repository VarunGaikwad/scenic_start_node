const { auth } = require("../middleware");
const router = require("express").Router();

router.use("/unauth", require("./unauth"));
router.use("/auth", auth, require("./auth"));

module.exports = router;
