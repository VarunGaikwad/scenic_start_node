import { Router, Request, Response } from "express";
import crypto from "crypto";
import { ObjectId } from "mongodb";
import { connectDB } from "../../db";

const router = Router();

function calculateFileHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * GET /admin/background-images
 * List all items
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    const db = await connectDB();
    const items = await db
      .collection("background_images")
      .find({})
      .sort({ created_at: -1 })
      .toArray();

    res.json(items);
  } catch (err) {
    console.error("Error fetching background images:", err);
    res.status(500).json({ error: "Failed to fetch items" });
  }
});

/**
 * POST /admin/background-images
 * Create a new item
 */
router.post("/", async (req: Request, res: Response) => {
  const { image_url, text_color, is_welcome, overlay_color, overlay_opacity } =
    req.body;

  if (!image_url || !text_color) {
    return res
      .status(400)
      .json({ error: "Image URL and text color are required" });
  }

  try {
    const db = await connectDB();

    // Simple hash of URL for now just to satisfy unique constraint if we don't have file content
    const file_hash = calculateFileHash(image_url);

    const newItem: any = {
      image_url,
      text_color,
      is_welcome: !!is_welcome,
      file_hash,
      overlay_color,
      overlay_opacity: overlay_opacity
        ? parseFloat(overlay_opacity)
        : undefined,
      created_at: new Date(),
      updated_at: new Date(),
    };

    const result = await db.collection("background_images").insertOne(newItem);
    res.status(201).json({ ...newItem, _id: result.insertedId });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(400).json({ error: "Duplicate image (hash exists)" });
    }
    console.error("Error creating item:", err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

/**
 * PUT /admin/background-images/:id
 * Update an item
 */
router.put("/:id", async (req: Request, res: Response) => {
  const { image_url, text_color, is_welcome, overlay_color, overlay_opacity } =
    req.body;
  const id = req.params.id;

  try {
    const db = await connectDB();
    const update: any = { updated_at: new Date() };

    if (image_url) {
      update.image_url = image_url;
      update.file_hash = calculateFileHash(image_url);
    }
    if (text_color) update.text_color = text_color;
    if (is_welcome !== undefined) update.is_welcome = !!is_welcome;
    if (overlay_color !== undefined) update.overlay_color = overlay_color;
    if (overlay_opacity !== undefined)
      update.overlay_opacity = parseFloat(overlay_opacity);

    const result: any = await db
      .collection("background_images")
      .findOneAndUpdate(
        { _id: new ObjectId(id as string) },
        { $set: update },
        { returnDocument: "after" },
      );

    if (!result) {
      return res.status(404).json({ error: "Item not found" });
    }

    // In MongoDB driver v6+, findOneAndUpdate might return the document directly or a ModifyResult depending on options
    // To be safe, we check if it's the document or has a value property
    const doc = result.value !== undefined ? result.value : result;

    res.json(doc);
  } catch (err) {
    console.error("Error updating item:", err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * DELETE /admin/background-images/:id
 * Delete an item
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const id = req.params.id;

  try {
    const db = await connectDB();
    const result = await db
      .collection("background_images")
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
