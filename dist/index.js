"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const cors_1 = __importDefault(require("cors"));
const db_1 = require("./db");
const route_1 = __importDefault(require("./route"));
const path_1 = __importDefault(require("path"));
const PORT = process.env.PORT || 3000;
(0, db_1.initDB)();
const app = (0, express_1.default)();
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, cookie_parser_1.default)());
const whitelist = process.env.FRONTEND_URLS
    ? process.env.FRONTEND_URLS.split(";")
    : [];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin ||
            whitelist.includes(origin) ||
            origin.startsWith("chrome-extension://") ||
            origin.startsWith("http://localhost")) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
}));
// Serve static files (admin panel)
app.use("/admin", express_1.default.static(path_1.default.join(__dirname, "public/admin-v2")));
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
        apis: ["./route/**/*.ts", "./route/**/*.js"],
    };
    const swaggerSpec = swaggerJsdoc(swaggerOptions);
    app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
    console.log("Swagger docs enabled at /docs (development only)");
}
// API Routes - All API routes will be prefixed with /api
app.use("/api", route_1.default);
exports.default = app;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server running locally at http://localhost:${PORT}`);
    });
}
