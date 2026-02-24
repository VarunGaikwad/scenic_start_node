"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = connectDB;
const mongodb_1 = require("mongodb");
const uri = process.env.MONGODB_URI;
if (!uri) {
    throw new Error("The MONGODB_URI environment variable is not set.");
}
const client = new mongodb_1.MongoClient(uri, {
    serverApi: {
        version: mongodb_1.ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
let dbInstance;
async function connectDB() {
    if (dbInstance)
        return dbInstance;
    try {
        await client.connect();
        dbInstance = client.db("scenicstart");
        console.log("🚀 Connected to MongoDB");
        return dbInstance;
    }
    catch (error) {
        console.error("❌ Connection failed", error);
        throw error;
    }
}
