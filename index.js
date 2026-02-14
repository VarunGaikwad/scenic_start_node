require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const apiRouters = require("./route");
const cookieParser = require("cookie-parser");

const PORT = process.env.PORT || 9091;
const app = express();

const allowedOrigins = (process.env.ALLOWED_ORIGIN || "").split(";");

app.use(
  cors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (origin.startsWith("chrome-extension://")) {
        return callback(null, true);
      }
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(express.static("public"));
app.use(express.json());

app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({ status: "UP", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "development") {
  const swaggerOptions = {
    definition: {
      openapi: "3.0.0",
      info: {
        title: "Scenic API",
        version: "1.0.0",
        description: "This API are only for scenic webapp use.",
      },
      servers: [
        {
          url: "http://localhost:8091",
        },
      ],
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

app.use("/", apiRouters);

module.exports = app;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running locally at http://localhost:${PORT}`);
  });
}
