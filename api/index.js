const serverless = require("serverless-http");
const app = require("../app");
const { connectDB, initDB } = require("../db");

let initialized = false;

async function bootstrap() {
  if (!initialized) {
    await connectDB();
    await initDB();
    initialized = true;
  }
}

module.exports = async (req, res) => {
  await bootstrap();
  return serverless(app)(req, res);
};
