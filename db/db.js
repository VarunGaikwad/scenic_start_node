const { MongoClient, ServerApiVersion } = require('mongodb');

// 1. Use environment variables (Security First!)
const uri = process.env.MONGODB_URI;

console.log("Checking URI:", process.env.MONGODB_URI ? "Found" : "NOT FOUND");

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

let dbInstance;

async function connectDB() {
    if (dbInstance) return dbInstance; // Return existing connection

    try {
        await client.connect();
        // Use your specific database name here
        dbInstance = client.db("scenicstart");
        console.log("🚀 Connected to MongoDB");
        return dbInstance;
    } catch (error) {
        console.error("❌ Connection failed", error);
        throw error;
    }
}

module.exports = { connectDB };