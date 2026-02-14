const express = require("express");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");

const shayariAndQuotesRouter = express.Router();

/**
 * Normalize text for deduplication
 * Critical for Hindi/Urdu text comparison
 */
function normalizeText(text) {
  return text
    .normalize("NFKC") // Unicode normalization for Hindi/Urdu
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/**
 * @swagger
 * components:
 *   schemas:
 *     ShayariQuote:
 *       type: object
 *       properties:
 *         date:
 *           type: string
 *           format: date
 *           description: Current UTC date
 *           example: "2024-02-06"
 *         type:
 *           type: string
 *           enum: [shayari, quotes]
 *           description: Type of content
 *         text:
 *           type: string
 *           description: The shayari or quote text
 *           example: "तुम इतना जो मुस्कुरा रहे हो..."
 *         author:
 *           type: string
 *           description: Author name
 *           example: "Jaun Elia"
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           description: Error message
 */

/**
 * @swagger
 * /auth/shayari-quotes:
 *   get:
 *     summary: Get deterministic quote of the day
 *     description: Returns the same quote/shayari for all users on the same UTC day. Uses deterministic selection based on date.
 *     tags:
 *       - Motivation
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [shayari, quotes]
 *         description: Type of content to retrieve
 *     responses:
 *       200:
 *         description: Quote of the day
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShayariQuote'
 *       400:
 *         description: Invalid or missing type parameter
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingType:
 *                 value:
 *                   message: Missing required query parameter 'type'
 *               invalidType:
 *                 value:
 *                   message: Invalid type. Use 'shayari' or 'quotes'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: No content available for the requested type
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             example:
 *               message: No shayari available
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
shayariAndQuotesRouter.get("/", async (req, res) => {
  try {
    const { type } = req.query;

    // Validate type parameter is provided
    if (!type) {
      return res.status(400).json({
        message: "Missing required query parameter 'type'",
      });
    }

    // Validate type value
    if (!["shayari", "quotes"].includes(type)) {
      return res.status(400).json({
        message: "Invalid type. Use 'shayari' or 'quotes'",
      });
    }

    const db = await connectDB();
    const col = db.collection("shayari_quotes");

    // Count documents of requested type
    const count = await col.countDocuments({ type });

    if (count === 0) {
      return res.status(404).json({
        message: `No ${type} available`,
      });
    }

    // Generate deterministic index based on UTC date
    // Same date = same quote for all users
    const now = new Date();

    // 15-minute deterministic bucket (UTC-based)
    const minutes = Math.floor(now.getTime() / (1000 * 60));
    const intervalKey = Math.floor(minutes / 15);
    const index = intervalKey % count;

    const item = await col
      .find({ type })
      .sort({ _id: 1 }) // stable ordering
      .skip(index)
      .limit(1)
      .next();

    if (!item) {
      return res.status(404).json({
        message: `No ${type} available`,
      });
    }

    return res.json({
      date: now.toISOString(),
      type,
      text: item.text,
      author: item.author || "Unknown",
    });
  } catch (err) {
    console.error("Error fetching quote of the day:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /auth/shayari-quotes:
 *   post:
 *     summary: Bulk create shayari or quotes (admin only)
 *     description: |
 *       Create one or multiple shayari/quotes. Features:
 *       - Automatic deduplication (case-insensitive, normalized)
 *       - Supports both single object and array input
 *       - Automatically limits to 31 items per type
 *       - Removes oldest entries when limit exceeded
 *     tags:
 *       - Motivation
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - text
 *                   - type
 *                 properties:
 *                   text:
 *                     type: string
 *                     minLength: 5
 *                     description: The shayari or quote text
 *                   type:
 *                     type: string
 *                     enum: [shayari, quotes]
 *                   author:
 *                     type: string
 *                     description: Author name (optional)
 *                   tags:
 *                     type: array
 *                     items:
 *                       type: string
 *                     description: Tags for categorization
 *               - type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - text
 *                     - type
 *                   properties:
 *                     text:
 *                       type: string
 *                       minLength: 5
 *                     type:
 *                       type: string
 *                       enum: [shayari, quotes]
 *                     author:
 *                       type: string
 *                     tags:
 *                       type: array
 *                       items:
 *                         type: string
 *           examples:
 *             single:
 *               value:
 *                 text: "तुम इतना जो मुस्कुरा रहे हो..."
 *                 type: shayari
 *                 author: Jaun Elia
 *                 tags: [love, sad]
 *             bulk:
 *               value:
 *                 - text: "Be yourself; everyone else is already taken."
 *                   type: quotes
 *                   author: Oscar Wilde
 *                 - text: "दिल की बात ज़ुबाँ पर आने से पहले..."
 *                   type: shayari
 *                   author: Unknown
 *     responses:
 *       201:
 *         description: Successfully created entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 inserted:
 *                   type: integer
 *                   description: Number of new entries inserted
 *                 attempted:
 *                   type: integer
 *                   description: Total number of entries in request
 *                 inPayloadDuplicates:
 *                   type: integer
 *                   description: Duplicates within the request payload
 *                 alreadyInDB:
 *                   type: integer
 *                   description: Entries that already existed in database
 *             example:
 *               message: Insert completed
 *               inserted: 3
 *               attempted: 5
 *               inPayloadDuplicates: 1
 *               alreadyInDB: 1
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               shortText:
 *                 value:
 *                   message: Each item must have text with min length 5
 *               invalidType:
 *                 value:
 *                   message: Invalid type. Use 'shayari' or 'quotes'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden (not admin)
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: All entries are duplicates
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 attempted:
 *                   type: integer
 *                 inPayloadDuplicates:
 *                   type: integer
 *                 alreadyInDB:
 *                   type: integer
 *             examples:
 *               payloadDupes:
 *                 value:
 *                   message: All entries are duplicates within payload
 *               dbDupes:
 *                 value:
 *                   message: All entries already exist in database
 *                   attempted: 3
 *                   inPayloadDuplicates: 0
 *                   alreadyInDB: 3
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
shayariAndQuotesRouter.post("/", admin, async (req, res) => {
  // Support both single object and array
  const payload = Array.isArray(req.body) ? req.body : [req.body];

  // Validate all items
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

  // Normalize and deduplicate within payload
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
        userId: req.user.id,
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

    // Check for existing duplicates
    const normalizedTexts = docs.map((d) => d.normalizedText);
    const existing = await col
      .find({
        normalizedText: { $in: normalizedTexts },
      })
      .project({ normalizedText: 1 })
      .toArray();

    const existingSet = new Set(existing.map((e) => e.normalizedText));

    // Filter out documents that already exist
    const newDocs = docs.filter((d) => !existingSet.has(d.normalizedText));
    const skipped = docs.length - newDocs.length;

    if (newDocs.length === 0) {
      return res.status(409).json({
        message: "All entries already exist in database",
        attempted: payload.length,
        inPayloadDuplicates: payload.length - docs.length,
        alreadyInDB: skipped,
      });
    }

    // Insert new documents
    // Using ordered: false to continue on duplicate key errors (defensive)
    let insertedCount = 0;
    try {
      const result = await col.insertMany(newDocs, { ordered: false });
      insertedCount = result.insertedCount;
    } catch (err) {
      // Handle duplicate key errors (11000) that might occur due to race conditions
      if (err.code === 11000) {
        // Some documents were inserted before the error
        insertedCount = err.result?.nInserted || 0;
      } else {
        throw err; // Re-throw if it's a different error
      }
    }

    // Enforce maximum 31 items per type
    for (const type of ["shayari", "quotes"]) {
      const count = await col.countDocuments({ type });

      if (count > 31) {
        const excess = count - 31;
        const idsToDelete = await col
          .find({ type })
          .sort({ _id: 1 })
          .limit(excess)
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
      inserted: insertedCount,
      attempted: payload.length,
      inPayloadDuplicates: payload.length - docs.length,
      alreadyInDB: skipped,
    });
  } catch (err) {
    console.error("Error creating shayari/quotes:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = shayariAndQuotesRouter;
