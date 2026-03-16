"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const crypto_1 = __importDefault(require("crypto"));
const mongodb_1 = require("mongodb");
const db_1 = require("../../db");
const multer_1 = __importDefault(require("multer"));
const supabase_1 = __importDefault(require("../../supabase"));
const bucketName = "live wallpaper";
// Configure multer
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: {
        fileSize: 50 * 1024 * 1024,
    },
    fileFilter: (_req, file, cb) => {
        const allowedMimeTypes = [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "video/mp4",
        ];
        if (allowedMimeTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error("Only image files or MP4 videos are allowed"));
        }
    },
});
const router = (0, express_1.Router)();
function calculateFileHash(buffer) {
    return crypto_1.default.createHash("sha256").update(buffer).digest("hex");
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
 * Create a new item (handles optional file upload)
 */
router.post("/", upload.single("image"), async (req, res) => {
    try {
        const { text_color, is_welcome, overlay_color, overlay_opacity, title, category, author_name, author_url, is_active, } = req.body;
        let { image_url } = req.body;
        const file = req.file;
        if (!file && (!image_url || !text_color)) {
            return res
                .status(400)
                .json({ error: "Image file or URL and text color are required" });
        }
        const db = await (0, db_1.connectDB)();
        let fileHash = "";
        let fileName = "";
        if (file) {
            fileHash = calculateFileHash(file.buffer);
            fileName = `${Date.now()}_${file.originalname}`;
            // Upload to Supabase
            const { error: uploadError } = await supabase_1.default.storage
                .from(bucketName)
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });
            if (uploadError) {
                throw uploadError;
            }
            image_url = supabase_1.default.storage.from(bucketName).getPublicUrl(fileName)
                .data.publicUrl;
        }
        else if (image_url) {
            fileHash = crypto_1.default.createHash("sha256").update(image_url).digest("hex");
        }
        const newItem = {
            image_url,
            media_type: file?.mimetype.startsWith("video/") ? "video" : "image",
            file_name: fileName || undefined,
            text_color: text_color || "light",
            is_welcome: is_welcome === "true" || is_welcome === true,
            file_hash: fileHash,
            overlay_color: overlay_color || "#000000",
            overlay_opacity: overlay_opacity !== undefined && overlay_opacity !== null
                ? parseFloat(overlay_opacity)
                : 0,
            title: title || "",
            category: category || "Uncategorized",
            author_name: author_name || "",
            author_url: author_url || "",
            is_active: is_active !== undefined
                ? is_active === "true" || is_active === true
                : true,
            created_at: new Date(),
            updated_at: new Date(),
        };
        const result = await db
            .collection("background_images")
            .insertOne(newItem);
        res.status(201).json({ ...newItem, _id: result.insertedId });
    }
    catch (err) {
        console.error("Error creating item:", err);
        res.status(500).json({ error: err.message || "Failed to create item" });
    }
});
/**
 * PUT /admin/background-images/:id
 * Update an item (handles optional file upload)
 */
router.put("/:id", upload.single("image"), async (req, res) => {
    const { text_color, is_welcome, overlay_color, overlay_opacity, title, category, author_name, author_url, is_active, } = req.body;
    let { image_url } = req.body;
    const file = req.file;
    const id = req.params.id;
    try {
        const db = await (0, db_1.connectDB)();
        const update = { updated_at: new Date() };
        if (file) {
            const fileHash = calculateFileHash(file.buffer);
            const fileName = `${Date.now()}_${file.originalname}`;
            // Upload to Supabase
            const { error: uploadError } = await supabase_1.default.storage
                .from(bucketName)
                .upload(fileName, file.buffer, {
                contentType: file.mimetype,
                upsert: true,
            });
            if (uploadError)
                throw uploadError;
            update.image_url = supabase_1.default.storage
                .from(bucketName)
                .getPublicUrl(fileName).data.publicUrl;
            update.file_hash = fileHash;
            update.file_name = fileName;
            update.media_type = file.mimetype.startsWith("video/")
                ? "video"
                : "image";
        }
        else if (image_url !== undefined) {
            update.image_url = image_url;
            update.file_hash = crypto_1.default
                .createHash("sha256")
                .update(image_url)
                .digest("hex");
        }
        if (text_color !== undefined)
            update.text_color = text_color;
        if (is_welcome !== undefined)
            update.is_welcome = is_welcome === "true" || is_welcome === true;
        if (overlay_color !== undefined)
            update.overlay_color = overlay_color;
        if (overlay_opacity !== undefined && overlay_opacity !== null)
            update.overlay_opacity = parseFloat(overlay_opacity);
        if (title !== undefined)
            update.title = title;
        if (category !== undefined)
            update.category = category;
        if (author_name !== undefined)
            update.author_name = author_name;
        if (author_url !== undefined)
            update.author_url = author_url;
        if (is_active !== undefined)
            update.is_active = is_active === "true" || is_active === true;
        const result = await db
            .collection("background_images")
            .findOneAndUpdate({ _id: new mongodb_1.ObjectId(id) }, { $set: update }, { returnDocument: "after" });
        if (!result) {
            return res.status(404).json({ error: "Item not found" });
        }
        const doc = result.value !== undefined ? result.value : result;
        res.json(doc);
    }
    catch (err) {
        console.error("Error updating item:", err);
        res.status(500).json({ error: err.message || "Failed to update item" });
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
