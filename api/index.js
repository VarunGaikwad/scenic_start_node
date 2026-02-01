require("dotenv").config();
const express = require("express");
const cors = require("cors");
const apiRoutes = require("./routes");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// Swagger (only in development)
if (process.env.NODE_ENV === "development") {
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Scenic Start NodeJS",
        version: "1.0.0",
        description: "This is Scenic Start NodeJS application",
      },
      servers: [
        {
          url: "/", // relative path works both locally and on Vercel
        },
      ],
    },
    apis: ["./routes/*.js"],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger docs enabled at /docs (development only)");
}

// API routes
app.use("/", apiRoutes);

module.exports = app;
