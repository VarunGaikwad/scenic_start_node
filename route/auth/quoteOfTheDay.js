const express = require("express");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");

const motivationQuotesRouter = express.Router();

/**
 * @swagger
 * /auth/quote-of-the-day:
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
motivationQuotesRouter.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const col = db.collection("motivation_quotes");

    const count = await col.countDocuments();
    if (count === 0) {
      return res.status(404).json({ message: "No quotes available" });
    }

    const today = new Date();
    const key =
      today.getUTCFullYear() * 10000 +
      (today.getUTCMonth() + 1) * 100 +
      today.getUTCDate();

    const index = key % count;

    const quote = await col
      .find({})
      .sort({ createdAt: 1 })
      .skip(index)
      .limit(1)
      .next();

    return res.json({
      date: today.toISOString().slice(0, 10),
      text: quote.text,
      author: quote.author || "Unknown",
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
motivationQuotesRouter.post("/", admin, async (req, res) => {
  const { text, author, tags } = req.body;

  if (!text || text.length < 5) {
    return res.status(400).json({ message: "Text too short" });
  }

  try {
    const db = await connectDB();
    const col = db.collection("motivation_quotes");

    await col.insertOne({
      text: text.trim(),
      author: author?.trim() || null,
      tags: Array.isArray(tags) ? tags : [],
      userId: null,
      createdAt: new Date(),
    });

    const count = await col.countDocuments();
    if (count > 31) {
      const excess = count - 31;

      const oldQuotes = await col
        .find({})
        .sort({ createdAt: 1 })
        .limit(excess)
        .toArray();

      await col.deleteMany({
        _id: { $in: oldQuotes.map((q) => q._id) },
      });
    }

    return res.status(201).json({ message: "Quote added" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate quote" });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = motivationQuotesRouter;
