const express = require("express");
const { connectDB } = require("../../db");

const motivationQuotesRouter = express.Router();

/**
 * 🔓 PUBLIC
 * Quote of the Day (deterministic)
 */
motivationQuotesRouter.get("/quote-of-the-day", async (req, res) => {
  try {
    const db = await connectDB();

    const quotes = await db
      .collection("motivation_quotes")
      .find({})
      .sort({ createdAt: 1 }) // oldest → newest
      .toArray();

    if (quotes.length === 0) {
      return res.status(404).json({ message: "No quotes available" });
    }

    const today = new Date();

    const key =
      today.getUTCFullYear() * 10000 +
      (today.getUTCMonth() + 1) * 100 +
      today.getUTCDate();

    const index = key % quotes.length;

    const quote = quotes[index];

    res.json({
      date: today.toISOString().slice(0, 10),
      text: quote.text,
      author: quote.author || "Unknown",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * 🔐 SECRET ADMIN API
 * Add quote (max 31, FIFO eviction)
 */
motivationQuotesRouter.post("/secret/add", async (req, res) => {
  const secret = req.headers["x-admin-secret"];

  if (secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ message: "Forbidden" });
  }

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

    // 🔥 Enforce MAX = 31
    const count = await col.countDocuments();

    if (count > 31) {
      const excess = count - 31;

      const oldQuotes = await col
        .find({})
        .sort({ createdAt: 1 })
        .limit(excess)
        .toArray();

      const ids = oldQuotes.map((q) => q._id);

      await col.deleteMany({ _id: { $in: ids } });
    }

    res.status(201).json({ message: "Quote added" });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Duplicate quote" });
    }

    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = motivationQuotesRouter;
