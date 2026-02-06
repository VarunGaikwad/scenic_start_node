const express = require("express");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");

const shayariAndQuotesRouter = express.Router();

function normalizeText(text) {
  return text
    .normalize("NFKC")   // 🔥 critical for Hindi/Urdu
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

  // 1️⃣ Validate input
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

  // 2️⃣ Normalize + deduplicate IN MEMORY
  const map = new Map();

  for (const item of payload) {
    const text = item.text.trim();
    const normalizedText = normalizeText(text);

    if (!map.has(normalizedText)) {
      map.set(normalizedText, {
        text,
        normalizedText,
        type: item.type,
        author: item.author?.trim() || null,
        tags: Array.isArray(item.tags) ? item.tags : [],
        userId: null,
        createdAt: new Date(),
      });
    }
  }

  const docs = Array.from(map.values());

  if (docs.length === 0) {
    return res.status(409).json({
      message: "All entries are duplicates within payload",
    });
  }

  try {
    const db = await connectDB();
    const col = db.collection("shayari_quotes");

    // 3️⃣ Check existing duplicates BEFORE inserting
    const normalizedTexts = docs.map(d => d.normalizedText);
    const existing = await col.find({
      normalizedText: { $in: normalizedTexts }
    }).project({ normalizedText: 1 }).toArray();

    const existingSet = new Set(existing.map(e => e.normalizedText));
    
    // Filter out documents that already exist
    const newDocs = docs.filter(d => !existingSet.has(d.normalizedText));
    const skipped = docs.length - newDocs.length;

    if (newDocs.length === 0) {
      return res.status(409).json({
        message: "All entries already exist in database",
        attempted: payload.length,
        inPayloadDuplicates: payload.length - docs.length,
        alreadyInDB: skipped,
      });
    }

    // 4️⃣ Insert only new documents
    const result = await col.insertMany(newDocs, { ordered: false });

    // 5️⃣ Enforce max 31 per type
    for (const type of ["shayari", "quotes"]) {
      const count = await col.countDocuments({ type });
      
      if (count > 31) {
        const idsToDelete = await col
          .find({ type })
          .sort({ createdAt: 1 })
          .limit(count - 31)
          .project({ _id: 1 })
          .toArray();

        if (idsToDelete.length > 0) {
          await col.deleteMany({
            _id: { $in: idsToDelete.map((d) => d._id) },
          });
        }
      }
    }

    return res.status(201).json({
      message: "Insert completed",
      inserted: result.insertedCount,
      attempted: payload.length,
      inPayloadDuplicates: payload.length - docs.length,
      alreadyInDB: skipped,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = shayariAndQuotesRouter;
