const { default: axios } = require("axios");

const temperatureRouter = require("express").Router();

temperatureRouter.get("/", async (req, res) => {
  let clientIP =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;

  if (clientIP === "::1") {
    clientIP = "108.181.48.97";
  }

  try {
    const latlongData = await fetchLatLong(clientIP);
    const weatherData = await fetchWeatherInfo(latlongData);

    return res.status(200).json(weatherData);
  } catch (err) {
    console.log(err);
  }
});

async function fetchLatLong(IP) {
  try {
    const { data } = await axios.get(`https://ipwhois.app/json/${IP}`, {
      proxy: false,
    });

    return data;
  } catch (err) {
    throw err;
  }
}

async function fetchWeatherInfo({ latitude, longitude }) {
  try {
    const { data } = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${process.env.OPENWEATHER_API}&units=metric`,
    );

    return data;
  } catch (err) {
    throw err;
  }
}

module.exports = temperatureRouter;
