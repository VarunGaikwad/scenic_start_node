const express = require("express");
const multer = require("multer");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");
const upload = multer({ storage: multer.memoryStorage() });
const supabase = require("../../supabase");

const backgroundImagesRouter = express.Router();

/**
 * @swagger
 * /auth/background-images:
 *   post:
 *     summary: Create a background image (admin only, file upload)
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
 *                 description: The background image file to upload
 *               text_color:
 *                 type: string
 *                 enum: [light, dark]
 *                 description: Text color for overlay
 *               overlay_color:
 *                 type: string
 *                 example: "#000000"
 *                 description: Optional overlay color
 *               overlay_opacity:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.4
 *                 description: Optional overlay opacity
 *               priority:
 *                 type: integer
 *                 example: 1
 *                 description: Priority for sorting
 *               is_active:
 *                 type: boolean
 *                 example: true
 *                 description: Whether this background is active
 *               is_welcome:
 *                 type: boolean
 *                 example: true
 *                 description: Whether this is the welcome wallpaper
 *     responses:
 *       201:
 *         description: Background image created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 id:
 *                   type: string
 *                 image_url:
 *                   type: string
 *                   description: URL of the uploaded image
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 *       500:
 *         description: Internal server error
 */

backgroundImagesRouter.post(
  "/",
  admin,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        text_color,
        overlay_color,
        overlay_opacity,
        priority,
        is_active,
        is_welcome,
      } = req.body;

      const file = req.file; // multer gives the uploaded file in req.file

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

      // Upload file to Supabase Storage
      const fileName = `${Date.now()}_${file.originalname}`;
      const { data, error: uploadError } = await supabase.storage
        .from("images") // your bucket name
        .upload(fileName, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ error: "File upload failed" });
      }

      const imageUrl = supabase.storage
        .from("images")
        .getPublicUrl(fileName).data.publicUrl;

      const db = (await connectDB()).collection("background_images");

      // 🔴 If is_welcome true, disable all others
      if (is_welcome === "true" || is_welcome === true) {
        await db.updateMany(
          { is_welcome: true },
          { $set: { is_welcome: false, updated_at: new Date() } }
        );
      }

      // Insert new document
      const doc = {
        image_url: imageUrl,
        text_color,
        overlay_color: overlay_color || null,
        overlay_opacity:
          overlay_opacity !== undefined ? Number(overlay_opacity) : null,
        priority: priority ? Number(priority) : 0,
        is_active: is_active === "false" ? false : true,
        is_welcome: is_welcome === "true" || is_welcome === true,
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
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

/**
 * @swagger
 * /auth/background-images:
 *   get:
 *     summary: Get a background image
 *     tags:
 *       - Background Images
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [welcome]
 *         description: >
 *           If set to 'welcome', returns the welcome background image.
 *     responses:
 *       200:
 *         description: Background image
 *       404:
 *         description: No background image found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
backgroundImagesRouter.get("/", async (req, res) => {
  try {
    const { type } = req.query;

    const db = await connectDB();
    const collection = db.collection("background_images");

    let filter = { is_active: true };

    // 🎯 Special case: welcome wallpaper
    if (type === "welcome") {
      filter = { is_welcome: true, is_active: true };
    }

    const wallpaper = await collection.findOne(filter, {
      sort: {
        priority: -1,        // highest priority first
        created_at: -1,      // fallback
      },
      projection: {
        updated_at: 0,
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
      priority: wallpaper.priority,
    });
  } catch (err) {
    console.error("Error fetching background image:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
});



module.exports = backgroundImagesRouter;
