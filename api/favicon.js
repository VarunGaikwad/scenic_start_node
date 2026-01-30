const { default: axios } = require("axios");

const faviconRouter = require("express").Router();

faviconRouter.get("/", async (req, res) => {
  const { url } = req.query;
  try {
    const { data } = await axios.get(
      "https://ico.faviconkit.net/favicon/" + url + "?sz=128",
      { proxy: false },
    );
    res.status(200).send(data);
  } catch (err) {
    console.log(err);
  }
});

module.exports = faviconRouter;
