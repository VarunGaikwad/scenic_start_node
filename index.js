require("dotenv").config();
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const cors = require("cors");

const apiRoutes = require("./api/routes");
const swaggerSpec = require("./swagger");

const app = express();

/* ---------- CORS ---------- */
const allowedOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(o => o.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(null, false);
  },
  allowedHeaders: ["Content-Type", "Authorization", "X-Admin-Secret"],
}));

app.use(express.json());

/* ---------- ROUTES ---------- */
app.get("/", (_req, res) => res.send("Hello World"));

app.get("/health", (_req, res) => {
  res.json({ status: "UP", timestamp: new Date().toISOString() });
});

app.use("/api", apiRoutes);

if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

module.exports = app;
