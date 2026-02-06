const express = require("express");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");

const shayariAndQuotesRouter = express.Router();

function normalizeText(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

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

  // 1️⃣ Validate input (fail fast)
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

    // 2️⃣ Normalize + prepare docs
    const docs = payload.map((item) => {
      const text = item.text.trim();

      return {
        text,
        normalizedText: normalizeText(text), // 🔥 REQUIRED
        type: item.type,
        author: item.author?.trim() || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        userId: null,
        createdAt: new Date(),
      };
    });

    // 3️⃣ Bulk insert (skip duplicates)
    const result = await col.insertMany(docs, { ordered: false });

    // 4️⃣ Enforce max 31 per type (deterministic)
    for (const type of ["shayari", "quotes"]) {
      const idsToDelete = await col
        .find({ type })
        .sort({ createdAt: 1 })
        .skip(31)
        .project({ _id: 1 })
        .toArray();

      if (idsToDelete.length > 0) {
        await col.deleteMany({
          _id: { $in: idsToDelete.map((d) => d._id) },
        });
      }
    }

    return res.status(201).json({
      message: "Insert completed",
      inserted: result.insertedCount,
      attempted: docs.length,
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({
        message: "Duplicate shayari/quote detected",
      });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});




module.exports = shayariAndQuotesRouter;
