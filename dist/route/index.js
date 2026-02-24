"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const middleware_1 = require("../middleware");
const unauth_1 = __importDefault(require("./unauth"));
const auth_1 = __importDefault(require("./auth"));
const admin_1 = __importDefault(require("./admin"));
const apiRouters = (0, express_1.Router)();
apiRouters.use("/unauth", unauth_1.default);
apiRouters.use("/auth", middleware_1.auth, auth_1.default);
apiRouters.use("/admin", middleware_1.auth, middleware_1.admin, admin_1.default);
exports.default = apiRouters;
