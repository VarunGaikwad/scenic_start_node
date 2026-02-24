"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("./db");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function createAdmin() {
    try {
        const db = await (0, db_1.connectDB)();
        const email = "admin@scenic.com";
        const password = "admin";
        const existing = await db.collection("users").findOne({ email });
        if (existing) {
            console.log("Admin user already exists");
            process.exit(0);
        }
        const passwordHash = await bcrypt_1.default.hash(password, 10);
        await db.collection("users").insertOne({
            email,
            passwordHash,
            role: "admin",
            status: "active",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        console.log(`Admin user created.\nEmail: ${email}\nPassword: ${password}`);
        process.exit(0);
    }
    catch (err) {
        console.error(err);
        process.exit(1);
    }
}
createAdmin();
