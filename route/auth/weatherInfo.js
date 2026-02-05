const axios = require("axios");
const express = require("express");
const temperatureRouter = express.Router();

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// cache: IP -> { data, timestamp }
const cache = new Map();

// pending: IP -> Promise
const pending = new Map();

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(ip);
    }
  }
}, 60 * 1000);

/**
 * GET /auth/temperature
 */
temperatureRouter.get("/", async (req, res) => {
  try {
    let clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    if (!clientIP) {
      return res.status(400).json({ message: "Unable to determine client IP" });
    }

    // normalize IPv6-mapped IPv4
    clientIP = clientIP.replace(/^::ffff:/, "");

    const now = Date.now();

    // 1️⃣ Serve from cache if valid
    const cached = cache.get(clientIP);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    // 2️⃣ Deduplicate in-flight requests
    if (!pending.has(clientIP)) {
      const promise = fetchTemperature(clientIP)
        .then((data) => {
          if (data) {
            cache.set(clientIP, { data, timestamp: Date.now() });
          }
          return data;
        })
        .finally(() => {
          pending.delete(clientIP);
        });

      pending.set(clientIP, promise);
    }

    const data = await pending.get(clientIP);

    if (!data) {
      return res
        .status(502)
        .json({ message: "Unable to fetch temperature data" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Temperature error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/* ---------------- HELPERS ---------------- */

async function fetchTemperature(ip) {
  const coords = await fetchLatLong(ip);
  if (!coords) return null;

  return fetchWeatherInfo(coords);
}

async function fetchLatLong(ip) {
  try {
    const { data } = await axios.get(`https://ipinfo.io/${ip}/json`, {
      timeout: 5000,
      proxy: false,
    });

    if (!data || !data.loc || !data.loc.includes(",")) {
      return null;
    }

    const [latitude, longitude] = data.loc.split(",");

    return {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
  } catch (err) {
    console.error("GeoIP error:", err.message);
    return null;
  }
}

async function fetchWeatherInfo({ latitude, longitude }) {
  try {
    const { data } = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat: latitude,
          lon: longitude,
          appid: process.env.OPENWEATHER_API,
          units: "metric",
        },
        timeout: 5000,
      },
    );

    return data;
  } catch (err) {
    console.error("Weather API error:", err.message);
    return null;
  }
}

module.exports = temperatureRouter;
