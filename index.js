require("dotenv").config();
const express = require("express");
const cors = require("cors");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");
const apiRouters = require("./route");

const PORT = process.env.PORT || 8091;
const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "UP", timestamp: new Date().toISOString() });
});

if (process.env.NODE_ENV === "development") {
  const swaggerOptions = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Background Images API",
      version: "1.0.0",
      description: "Admin-only API for managing background images",
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
