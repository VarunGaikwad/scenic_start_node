const rateLimit = require("express-rate-limit");

// Basic rate limiting - adjust thresholds as needed
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 requests per 15 minutes
  message: "Too many login attempts, please try again after 15 minutes.",
});

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per 15 minutes
  message: "Too many requests, please try again after 15 minutes.",
});

module.exports = {
  loginLimiter,
  generalLimiter,
};