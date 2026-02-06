const express = require("express");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");

const shayariAndQuotesRouter = express.Router();

/**
 * @swagger
 * /auth/shayari-quotes:
 *   get:
 *     summary: Get deterministic quote of the day
 *     description: Returns the same quote for all users on the same UTC day
 *     tags:
 *       - Motivation
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Quote of the day
 *       404:
 *         description: No quotes available
 */
shayariAndQuotesRouter.get("/", async (req, res) => {
  try {
    const { type } = req.query;

    // 1️⃣ Hard validation
    if (!["shayari", "quotes"].includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Use 'shayari' or 'quotes'",
      });
    }

    const db = await connectDB();
    const col = db.collection("shayari_quotes");

    // 2️⃣ Count only requested type
    const count = await col.countDocuments({ type });
    if (count === 0) {
      return res.status(404).json({
        message: `No ${type} available`,
      });
    }

    // 3️⃣ Deterministic key (UTC day)
    const today = new Date();
    const key =
      today.getUTCFullYear() * 10000 +
      (today.getUTCMonth() + 1) * 100 +
      today.getUTCDate();

    const index = key % count;

    // 4️⃣ Fetch deterministic document
    const item = await col
      .find({ type })
      .sort({ createdAt: 1 })
      .skip(index)
      .limit(1)
      .next();

    return res.json({
      date: today.toISOString().slice(0, 10),
      type,
      text: item.text,
      author: item.author || "Unknown",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});


/**
 * @swagger-ignore
 * 🔐 SECRET ADMIN API (do not expose in docs)
 */
shayariAndQuotesRouter.post("/", admin, async (req, res) => {
  const payload = Array.isArray(req.body) ? req.body : [req.body];

  // 1️⃣ Validate all items first (fail fast)
  for (const item of payload) {
    if (!item.text || item.text.trim().length < 5) {
      return res.status(400).json({
        message: "Each item must have text with min length 5",
      });
    }

    if (!["shayari", "quotes"].includes(item.type)) {
      return res.status(400).json({
        message: "Invalid type. Use 'shayari' or 'quotes'",
      });
    }
  }

  try {
    const db = await connectDB();
    const col = db.collection("shayari_quotes");

    // 2️⃣ Normalize documents
    const docs = payload.map((item) => ({
      text: item.text.trim(),
      type: item.type,
      author: item.author?.trim() || null,
      tags: Array.isArray(item.tags) ? item.tags : [],
      userId: null,
      createdAt: new Date(),
    }));

    // 3️⃣ Bulk insert
    const result = await col.insertMany(docs, { ordered: false });

    // 4️⃣ Enforce max 31 per type
    for (const type of ["shayari", "quotes"]) {
      const count = await col.countDocuments({ type });

      if (count > 31) {
        const excess = count - 31;

        const oldItems = await col
          .find({ type })
          .sort({ createdAt: 1 })
          .limit(excess)
          .toArray();

        await col.deleteMany({
          _id: { $in: oldItems.map((q) => q._id) },
        });
      }
    }

    return res.status(201).json({
      message: "Entries added",
      inserted: result.insertedCount,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "One or more duplicate entries",
      });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});



module.exports = shayariAndQuotesRouter;
