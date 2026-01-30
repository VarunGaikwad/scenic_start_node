const { MongoClient, ServerApiVersion } = require("mongodb");

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

let dbInstance;

async function connectDB() {
  if (dbInstance) return dbInstance;

  try {
    await client.connect();
    dbInstance = client.db("scenicstart");
    console.log("🚀 Connected to MongoDB");
    return dbInstance;
  } catch (error) {
    console.error("❌ Connection failed", error);
    throw error;
  }
}

module.exports = { connectDB };
