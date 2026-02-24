import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../../db";

const router = Router();

/**
 * GET /admin/shayari-quotes
 * List all items
 */
router.get("/", async (req: Request, res: Response) => {
  const { type, search } = req.query;
  const query: any = {};

  if (type) {
    query.type = type;
  }

  if (search && typeof search === "string") {
    query.text = { $regex: search, $options: "i" };
  }

  try {
    const db = await connectDB();
    const items = await db
      .collection("shayari_quotes")
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json(items);
  } catch (err) {
    console.error("Error fetching shayari/quotes:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

/**
 * GET /admin/shayari-quotes/:id
 * Get a single item by ID
 */
router.get("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const db = await connectDB();
    const item = await db
      .collection("shayari_quotes")
      .findOne({ _id: new ObjectId(id as string) });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json(item);
  } catch (err) {
    console.error("Error fetching item:", err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

/**
 * POST /admin/shayari-quotes
 * Create a new item
 */
router.post("/", async (req: Request, res: Response) => {
  const { text, type, author, tags } = req.body;

  if (!text || !type) {
    return res.status(400).json({ error: "Text and type are required" });
  }

  const normalizedText = text
    .normalize("NFKC")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  try {
    const db = await connectDB();

    // Check for duplicate normalized text
    const existing = await db
      .collection("shayari_quotes")
      .findOne({ normalizedText });
    if (existing) {
      return res.status(400).json({ error: "Duplicate text exists" });
    }

    const newItem: any = {
      text: text.trim(),
      normalizedText,
      type,
      author: author || null,
      tags: tags || [],
      userId: null, // Admin created
      createdAt: new Date(),
    };

    const result = await db.collection("shayari_quotes").insertOne(newItem);
    res.status(201).json({ ...newItem, _id: result.insertedId });
  } catch (err) {
    console.error("Error creating item:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

/**
 * PUT /admin/shayari-quotes/:id
 * Update an item
 */
router.put("/:id", async (req: Request, res: Response) => {
  const { text, type, author, tags } = req.body;
  const id = req.params.id;

  try {
    const db = await connectDB();
    const update: any = {};

    if (text) {
      update.text = text.trim();
      update.normalizedText = text
        .normalize("NFKC")
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ");
    }
    if (type) update.type = type;
    if (author !== undefined) update.author = author;
    if (tags) update.tags = tags;

    const result: any = await db
      .collection("shayari_quotes")
      .findOneAndUpdate(
        { _id: new ObjectId(id as string) },
        { $set: update },
        { returnDocument: "after" },
      );

    if (!result) {
      return res.status(404).json({ error: "Item not found" });
    }

    const doc = result.value !== undefined ? result.value : result;
    res.json(doc);
  } catch (err: any) {
    // Check for duplicate key error on normalizedText
    if (err.code === 11000) {
      return res.status(400).json({ error: "Duplicate text exists" });
    }
    console.error("Error updating item:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * DELETE /admin/shayari-quotes/:id
 * Delete an item
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const db = await connectDB();
    const result = await db
      .collection("shayari_quotes")
      .deleteOne({ _id: new ObjectId(id as string) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Item not found" });
    }

    res.json({ success: true, message: "Item deleted" });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default router;
