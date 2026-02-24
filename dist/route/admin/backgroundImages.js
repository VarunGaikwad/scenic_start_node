"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const mongodb_1 = require("mongodb");
const db_1 = require("../../db");
const router = (0, express_1.Router)();
function calculateFileHash(content) {
    return crypto_1.default.createHash("sha256").update(content).digest("hex");
}
/**
 * GET /admin/background-images
 * List all items
 */
router.get("/", async (_req, res) => {
    try {
        const db = await (0, db_1.connectDB)();
        const items = await db
            .collection("background_images")
            .find({})
            .sort({ created_at: -1 })
            .toArray();
        res.json(items);
    }
    catch (err) {
        console.error("Error fetching background images:", err);
        res.status(500).json({ error: "Failed to fetch items" });
    }
});
/**
 * POST /admin/background-images
 * Create a new item
 */
router.post("/", async (req, res) => {
    const { image_url, text_color, is_welcome, overlay_color, overlay_opacity } = req.body;
    if (!image_url || !text_color) {
        return res
            .status(400)
            .json({ error: "Image URL and text color are required" });
    }
    try {
        const db = await (0, db_1.connectDB)();
        // Simple hash of URL for now just to satisfy unique constraint if we don't have file content
        const file_hash = calculateFileHash(image_url);
        const newItem = {
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
    }
    catch (err) {
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
router.put("/:id", async (req, res) => {
    const { image_url, text_color, is_welcome, overlay_color, overlay_opacity } = req.body;
    const id = req.params.id;
    try {
        const db = await (0, db_1.connectDB)();
        const update = { updated_at: new Date() };
        if (image_url) {
            update.image_url = image_url;
            update.file_hash = calculateFileHash(image_url);
        }
        if (text_color)
            update.text_color = text_color;
        if (is_welcome !== undefined)
            update.is_welcome = !!is_welcome;
        if (overlay_color !== undefined)
            update.overlay_color = overlay_color;
        if (overlay_opacity !== undefined)
            update.overlay_opacity = parseFloat(overlay_opacity);
        const result = await db
            .collection("background_images")
            .findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, { $set: update }, { returnDocument: "after" });
        if (!result) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json(result);
    }
    catch (err) {
        console.error("Error updating item:", err);
        res.status(500).json({ error: "Failed to update item" });
    }
});
/**
 * DELETE /admin/background-images/:id
 * Delete an item
 */
router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const db = await (0, db_1.connectDB)();
        const result = await db
            .collection("background_images")
            .deleteOne({ _id: new mongodb_1.ObjectId(id) });
        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Item not found" });
        }
        res.json({ success: true, message: "Item deleted" });
    }
    catch (err) {
        console.error("Error deleting item:", err);
        res.status(500).json({ error: "Failed to delete item" });
    }
});
exports.default = router;
