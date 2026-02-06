const axios = require("axios");
const express = require("express");

const temperatureRouter = express.Router();

// Configuration
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
const API_TIMEOUT = 5000; // 5 seconds

// In-memory caches
// cache: key -> { data, timestamp }
const cache = new Map();

// pending: key -> Promise (prevents duplicate concurrent requests)
const pending = new Map();

// Validate API key on startup
if (!process.env.OPENWEATHER_API) {
  console.error("⚠️  WARNING: OPENWEATHER_API environment variable is not set!");
}

/**
 * Check if IP is public (not localhost or private)
 */
function isPublicIP(ip) {
  if (!ip) return false;
  
  // Localhost
  if (ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
    return false;
  }
  
  // Private IPv4 ranges
  const privateIPv4 = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
  ];
  
  return !privateIPv4.some(pattern => pattern.test(ip));
}

/**
 * Transform OpenWeather API response to cleaner format
 */
function transformWeatherData(data) {
  if (!data || !data.main) return null;
  
  return {
    temperature: {
      current: data.main.temp,
      feels_like: data.main.feels_like,
      min: data.main.temp_min,
      max: data.main.temp_max,
    },
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    visibility: data.visibility, // in meters
    weather: {
      main: data.weather?.[0]?.main,
      description: data.weather?.[0]?.description,
      icon: data.weather?.[0]?.icon,
    },
    wind: {
      speed: data.wind?.speed,
      deg: data.wind?.deg,
    },
    location: {
      name: data.name,
      country: data.sys?.country,
      coordinates: {
        lat: data.coord?.lat,
        lon: data.coord?.lon,
      },
      sunrise: data.sys?.sunrise, // Unix timestamp
      sunset: data.sys?.sunset,   // Unix timestamp
    },
    timestamp: new Date().toISOString(),
  };
}

// Periodic cache cleanup
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}, CLEANUP_INTERVAL);

/**
 * Cleanup function for graceful shutdown
 */
function cleanup() {
  clearInterval(cleanupInterval);
  cache.clear();
  pending.clear();
}

/**
 * @swagger
 * components:
 *   schemas:
 *     Temperature:
 *       type: object
 *       properties:
 *         temperature:
 *           type: object
 *           properties:
 *             current:
 *               type: number
 *               description: Current temperature in Celsius
 *               example: 22.5
 *             feels_like:
 *               type: number
 *               description: Feels like temperature in Celsius
 *               example: 21.3
 *             min:
 *               type: number
 *               description: Minimum temperature
 *               example: 20.0
 *             max:
 *               type: number
 *               description: Maximum temperature
 *               example: 25.0
 *         humidity:
 *           type: number
 *           description: Humidity percentage
 *           example: 65
 *         pressure:
 *           type: number
 *           description: Atmospheric pressure in hPa
 *           example: 1013
 *         visibility:
 *           type: number
 *           description: Visibility in meters
 *           example: 10000
 *         weather:
 *           type: object
 *           properties:
 *             main:
 *               type: string
 *               example: Clear
 *             description:
 *               type: string
 *               example: clear sky
 *             icon:
 *               type: string
 *               example: 01d
 *         wind:
 *           type: object
 *           properties:
 *             speed:
 *               type: number
 *               description: Wind speed in m/s
 *               example: 3.5
 *             deg:
 *               type: number
 *               description: Wind direction in degrees
 *               example: 180
 *         location:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               example: Tokyo
 *             country:
 *               type: string
 *               example: JP
 *             coordinates:
 *               type: object
 *               properties:
 *                 lat:
 *                   type: number
 *                 lon:
 *                   type: number
 *             sunrise:
 *               type: number
 *               description: Sunrise time (Unix timestamp)
 *               example: 1707187200
 *             sunset:
 *               type: number
 *               description: Sunset time (Unix timestamp)
 *               example: 1707226800
 *         timestamp:
 *           type: string
 *           format: date-time
 *           description: When this data was fetched
 */

/**
 * @swagger
 * /auth/temperature:
 *   get:
 *     summary: Get current temperature and weather data
 *     description: |
 *       Fetches weather data for a location. Two modes:
 *       1. Coordinate-based: Provide lat/lon query parameters
 *       2. IP-based: Automatically detects location from client IP
 *       
 *       Results are cached for 5 minutes. Concurrent requests for the same location
 *       are deduplicated to prevent API abuse.
 *     tags:
 *       - Weather
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lat
 *         schema:
 *           type: number
 *           minimum: -90
 *           maximum: 90
 *         description: Latitude coordinate (requires lon)
 *         example: 35.6762
 *       - in: query
 *         name: lon
 *         schema:
 *           type: number
 *           minimum: -180
 *           maximum: 180
 *         description: Longitude coordinate (requires lat)
 *         example: 139.6503
 *     responses:
 *       200:
 *         description: Weather data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Temperature'
 *       400:
 *         description: Invalid coordinates or unable to determine location
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               noIP:
 *                 value:
 *                   message: Unable to determine client IP
 *               privateIP:
 *                 value:
 *                   message: Cannot determine location from private IP address
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       502:
 *         description: Unable to fetch temperature data from external API
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: Unable to fetch temperature data
 */
temperatureRouter.get("/", async (req, res) => {
  try {
    const now = Date.now();

    // Parse and validate coordinates
    const lat = req.query.lat ? Number(req.query.lat) : null;
    const lon = req.query.lon ? Number(req.query.lon) : null;

    const hasCoords =
      Number.isFinite(lat) &&
      Number.isFinite(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180;

    let cacheKey;

    // Mode 1: Coordinate-based lookup
    if (hasCoords) {
      // Round coordinates to 2 decimal places for cache key (~1km precision)
      const roundedLat = Math.round(lat * 100) / 100;
      const roundedLon = Math.round(lon * 100) / 100;
      cacheKey = `geo:${roundedLat},${roundedLon}`;

      // Check cache
      const cached = cache.get(cacheKey);
      if (cached && now - cached.timestamp < CACHE_TTL) {
        return res.status(200).json(cached.data);
      }

      // Check pending requests (deduplication)
      if (!pending.has(cacheKey)) {
        const promise = fetchTemperatureByCoords(lat, lon)
          .then((data) => {
            if (data) {
              const transformed = transformWeatherData(data);
              if (transformed) {
                cache.set(cacheKey, {
                  data: transformed,
                  timestamp: Date.now(),
                });
                return transformed;
              }
            }
            return null;
          })
          .finally(() => pending.delete(cacheKey));

        pending.set(cacheKey, promise);
      }

      const data = await pending.get(cacheKey);

      if (!data) {
        return res
          .status(502)
          .json({ message: "Unable to fetch temperature data" });
      }

      return res.status(200).json(data);
    }

    // Mode 2: IP-based lookup
    let clientIP =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket.remoteAddress;

    if (!clientIP) {
      return res.status(400).json({ message: "Unable to determine client IP" });
    }

    // Normalize IPv6-mapped IPv4 addresses
    clientIP = clientIP.replace(/^::ffff:/, "");

    // Validate IP is public
    if (!isPublicIP(clientIP)) {
      return res.status(400).json({
        message: "Cannot determine location from private IP address",
      });
    }

    cacheKey = `ip:${clientIP}`;

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL) {
      return res.status(200).json(cached.data);
    }

    // Check pending requests (deduplication)
    if (!pending.has(cacheKey)) {
      const promise = fetchTemperatureByIP(clientIP)
        .then((data) => {
          if (data) {
            const transformed = transformWeatherData(data);
            if (transformed) {
              cache.set(cacheKey, {
                data: transformed,
                timestamp: Date.now(),
              });
              return transformed;
            }
          }
          return null;
        })
        .finally(() => pending.delete(cacheKey));

      pending.set(cacheKey, promise);
    }

    const data = await pending.get(cacheKey);

    if (!data) {
      return res
        .status(502)
        .json({ message: "Unable to fetch temperature data" });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error("Temperature endpoint error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/* ---------------- HELPER FUNCTIONS ---------------- */

/**
 * Fetch latitude/longitude from IP address using ipinfo.io
 */
async function fetchLatLong(ip) {
  try {
    const { data } = await axios.get(`https://ipinfo.io/${ip}/json`, {
      timeout: API_TIMEOUT,
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
    console.error("GeoIP lookup error:", err.message);
    return null;
  }
}

/**
 * Fetch weather information from OpenWeatherMap API
 */
async function fetchWeatherInfo({ latitude, longitude }) {
  try {
    if (!process.env.OPENWEATHER_API) {
      console.error("OPENWEATHER_API environment variable not set");
      return null;
    }

    const { data } = await axios.get(
      "https://api.openweathermap.org/data/2.5/weather",
      {
        params: {
          lat: latitude,
          lon: longitude,
          appid: process.env.OPENWEATHER_API,
          units: "metric",
        },
        timeout: API_TIMEOUT,
      }
    );

    return data;
  } catch (err) {
    console.error("Weather API error:", err.message);
    return null;
  }
}

/**
 * Fetch temperature data by IP address
 */
async function fetchTemperatureByIP(ip) {
  const coords = await fetchLatLong(ip);
  if (!coords) return null;

  return fetchWeatherInfo(coords);
}

/**
 * Fetch temperature data by coordinates
 */
async function fetchTemperatureByCoords(lat, lon) {
  return fetchWeatherInfo({
    latitude: lat,
    longitude: lon,
  });
}

// Export cleanup for graceful shutdown
temperatureRouter.cleanup = cleanup;

module.exports = temperatureRouter;