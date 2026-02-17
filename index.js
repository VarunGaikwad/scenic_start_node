require("dotenv").config();

const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { initDB } = require("./db");
const apiRouters = require("./route");
const path = require("path");

const PORT = process.env.PORT || 3000;

initDB();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const whitelist = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(";")
  : [];
app.use(
  cors({
    origin: (origin, callback) => {
      console.log("Origin", origin);
      if (
        !origin ||
        whitelist.includes(origin) ||
        origin.startsWith("chrome-extension://")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// Serve static files (admin panel)
app.use("/admin", express.static(path.join(__dirname, "public/admin")));

// Development-only middleware (Swagger docs)
if (process.env.NODE_ENV === "development") {
  const swaggerJsdoc = require("swagger-jsdoc");
  const swaggerUi = require("swagger-ui-express");

  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "API Documentation",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [
        {
          bearerAuth: [],
        },
      ],
    },
    apis: ["./route/**/*.js"],
  };

  const swaggerSpec = swaggerJsdoc(swaggerOptions);
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("Swagger docs enabled at /docs (development only)");
}

// API Routes - All API routes will be prefixed with /api
app.use("/api", apiRouters);

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running locally at http://localhost:${PORT}`);
  });
}
