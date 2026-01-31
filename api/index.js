require("dotenv").config();

const express = require("express");
const cors = require("cors");
const serverless = require("serverless-http");

const apiRoutes = require("./routes");

const app = express();

/* ---------- MIDDLEWARE ---------- */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------- BASE ROUTES ---------- */
app.get("/", (_req, res) => {
  res.send("API is running");
});

app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

/* ---------- API ROUTES ---------- */
app.use("/", apiRoutes);

/* ---------- EXPORT ---------- */
module.exports = serverless(app);
