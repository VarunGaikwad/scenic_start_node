const express = require("express");
const multer = require("multer");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");
const supabase = require("../../supabase");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");

// Configure multer with file size and type validation
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const backgroundImagesRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     BackgroundImage:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Unique identifier
 *         image_url:
 *           type: string
 *           description: Public URL of the background image
 *         text_color:
 *           type: string
 *           enum: [light, dark]
 *           description: Text color for overlay content
 *         overlay_color:
 *           type: string
 *           nullable: true
 *           description: Hex color code for overlay
 *         overlay_opacity:
 *           type: number
 *           nullable: true
 *           minimum: 0
 *           maximum: 1
 *           description: Opacity of the overlay
 *         is_welcome:
 *           type: boolean
 *           description: Whether this is the welcome wallpaper
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 */

/**
 * @swagger
 * /auth/background-images:
 *   post:
 *     summary: Create a background image (admin only, file upload)
 *     description: Upload a new background image. Only one image can be set as the welcome wallpaper at a time.
 *     tags:
 *       - Background Images
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - image
 *               - text_color
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The background image file to upload (max 10MB)
 *               text_color:
 *                 type: string
 *                 enum: [light, dark]
 *                 description: Text color for overlay
 *               overlay_color:
 *                 type: string
 *                 example: "#000000"
 *                 description: Optional overlay color (hex format)
 *               overlay_opacity:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.4
 *                 description: Optional overlay opacity (0-1)
 *               is_welcome:
 *                 type: boolean
 *                 example: true
 *                 description: Whether this is the welcome wallpaper
 *     responses:
 *       201:
 *         description: Background image created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Background image created
 *                 id:
 *                   type: string
 *                 image_url:
 *                   type: string
 *                   description: URL of the uploaded image
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingFields:
 *                 value:
 *                   error: Image file and text_color are required
 *               invalidTextColor:
 *                 value:
 *                   error: text_color must be 'light' or 'dark'
 *               invalidOpacity:
 *                 value:
 *                   error: overlay_opacity must be between 0 and 1
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
 *         description: Duplicate image
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 id:
 *                   type: string
 *                 image_url:
 *                   type: string
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
backgroundImagesRouter.post(
  "/",
  admin,
  upload.single("image"),
  async (req, res) => {
    try {
      const { text_color, overlay_color, overlay_opacity, is_welcome } =
        req.body;
      const file = req.file;

      if (!file || !text_color) {
        return res.status(400).json({
          error: "Image file and text_color are required",
        });
      }

      if (!["light", "dark"].includes(text_color)) {
        return res.status(400).json({
          error: "text_color must be 'light' or 'dark'",
        });
      }

      // Validate overlay_opacity if provided
      if (overlay_opacity !== undefined) {
        const opacity = parseFloat(overlay_opacity);
        if (isNaN(opacity) || opacity < 0 || opacity > 1) {
          return res.status(400).json({
            error: "overlay_opacity must be between 0 and 1",
          });
        }
      }

      const db = (await connectDB()).collection("background_images");

      // Compute file hash for duplicate detection
      const hash = crypto
        .createHash("sha256")
        .update(file.buffer)
        .digest("hex");

      // Check if hash already exists
      const existing = await db.findOne({ file_hash: hash });
      if (existing) {
        return res.status(409).json({
          error: "This image has already been uploaded",
          id: existing._id.toString(),
          image_url: existing.image_url,
        });
      }

      // Upload to Supabase
      const fileName = `${Date.now()}_${file.originalname}`;
      const bucketName = "background image";

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: "File upload failed" });
      }

      const imageUrl = supabase.storage.from(bucketName).getPublicUrl(fileName)
        .data.publicUrl;

      // Parse is_welcome as boolean
      const isWelcomeBool = is_welcome === "true" || is_welcome === true;

      // Disable previous welcome wallpaper if needed
      if (isWelcomeBool) {
        await db.updateMany(
          { is_welcome: true },
          { $set: { is_welcome: false, updated_at: new Date() } }
        );
      }

      // Insert document with hash and filename for easier deletion
      const doc = {
        image_url: imageUrl,
        file_name: fileName, // Store filename for reliable deletion
        file_hash: hash,
        text_color,
        overlay_color: overlay_color || null,
        overlay_opacity:
          overlay_opacity !== undefined ? parseFloat(overlay_opacity) : null,
        is_welcome: isWelcomeBool,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await db.insertOne(doc);

      return res.status(201).json({
        message: "Background image created",
        id: result.insertedId.toString(),
        image_url: imageUrl,
      });
    } catch (err) {
      console.error("Error creating background image:", err);

      // Handle multer file size/type errors
      if (err.message === "Only image files are allowed") {
        return res.status(400).json({ error: err.message });
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "File size exceeds 10MB limit" });
      }

      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /auth/background-images:
 *   get:
 *     summary: Get a background image
 *     description: Returns a welcome wallpaper for new users, or a regular wallpaper for existing users
 *     tags:
 *       - Background Images
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Background image
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/BackgroundImage'
 *       404:
 *         description: No background image found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Background image not found
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
backgroundImagesRouter.get("/", async (req, res) => {
  try {
    const db = await connectDB();
    const collection = db.collection("background_images");

    // Determine filter based on user status
    let filter = {};
    if (req.user.new_user) {
      // New users get the welcome wallpaper
      filter = { is_welcome: true };
    } else {
      // Existing users get regular wallpapers (not welcome)
      filter = { $or: [{ is_welcome: false }, { is_welcome: { $exists: false } }] };
    }

    const wallpaper = await collection.findOne(filter, {
      sort: {
        created_at: -1,
      },
      projection: {
        updated_at: 0,
        file_hash: 0,
        file_name: 0,
      },
    });

    if (!wallpaper) {
      return res.status(404).json({
        message: "Background image not found",
      });
    }

    return res.status(200).json({
      id: wallpaper._id.toString(),
      image_url: wallpaper.image_url,
      text_color: wallpaper.text_color,
      overlay_color: wallpaper.overlay_color,
      overlay_opacity: wallpaper.overlay_opacity,
      is_welcome: wallpaper.is_welcome,
    });
  } catch (err) {
    console.error("Error fetching background image:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});

/**
 * @swagger
 * /auth/background-images/{id}:
 *   delete:
 *     summary: Delete a background image (admin only)
 *     description: Delete a background image from both database and storage
 *     tags:
 *       - Background Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: MongoDB ID of the background image to delete
 *     responses:
 *       200:
 *         description: Background image deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Background image deleted successfully. It can now be re-uploaded.
 *       400:
 *         description: Invalid ID format
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Background image not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
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
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
backgroundImagesRouter.delete("/:id", admin, async (req, res) => {
  try {
    const { id } = req.params;
    const db = (await connectDB()).collection("background_images");

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    // Find the document first
    const doc = await db.findOne({ _id: new ObjectId(id) });
    if (!doc) {
      return res.status(404).json({ error: "Background image not found" });
    }

    // Delete file from Supabase using stored filename
    const bucketName = "background image";
    const fileName = doc.file_name; // Use stored filename instead of parsing URL

    if (fileName) {
      const { error: supabaseError } = await supabase.storage
        .from(bucketName)
        .remove([fileName]);

      if (supabaseError) {
        console.error("Supabase delete error:", supabaseError);
        // Continue anyway - we still want to delete the DB record
      }
    }

    // Delete document from MongoDB (including file_hash, allowing re-upload)
    await db.deleteOne({ _id: new ObjectId(id) });

    return res.status(200).json({
      message:
        "Background image deleted successfully. It can now be re-uploaded.",
    });
  } catch (err) {
    console.error("Error deleting background image:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = backgroundImagesRouter;