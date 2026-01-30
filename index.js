require("dotenv").config();
const express = require("express");
const apiRoutes = require("./api");
const app = express();
const { connectDB, initDB } = require("./db");
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.send("Hello World!");
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/api", apiRoutes);

(async () => {
  await connectDB();
  await initDB();

  app.listen(PORT, () => {
    console.log(`http://localhost:${PORT} is listening`);
  });
})();
