const express = require("express");
const { connectDB } = require("../../db");
const { admin } = require("../../middleware");

const backgroundImagesRouter = express.Router();

/**
 * @swagger
 * /auth/background-images:
 *   post:
 *     summary: Create a background image (admin only)
 *     tags:
 *       - Background Images
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - image_url
 *               - text_color
 *             properties:
 *               image_url:
 *                 type: string
 *                 example: https://cdn.example.com/bg/hero.webp
 *               text_color:
 *                 type: string
 *                 enum: [light, dark]
 *               overlay_color:
 *                 type: string
 *                 example: "#000000"
 *               overlay_opacity:
 *                 type: number
 *                 minimum: 0
 *                 maximum: 1
 *                 example: 0.4
 *               priority:
 *                 type: integer
 *                 example: 1
 *               is_active:
 *                 type: boolean
 *                 example: true
 *               is_welcome:
 *                 type: boolean
 *                 example: true
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
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (not admin)
 *       500:
 *         description: Internal server error
 */
backgroundImagesRouter.post("/", admin, async (req, res) => {
  const session = (await connectDB()).client.startSession();

  try {
    const {
      image_url,
      text_color,
      overlay_color,
      overlay_opacity,
      priority,
      is_active,
      is_welcome,
    } = req.body;

    if (!image_url || !text_color) {
      return res.status(400).json({
        error: "image_url and text_color are required",
      });
    }

    if (!["light", "dark"].includes(text_color)) {
      return res.status(400).json({
        error: "text_color must be 'light' or 'dark'",
      });
    }

    const db = await connectDB();
    const collection = db.collection("background_images");

    await session.withTransaction(async () => {
      // 🔴 Step 1: If incoming is_welcome is true, disable all others
      if (is_welcome === true) {
        await collection.updateMany(
          { is_welcome: true },
          {
            $set: {
              is_welcome: false,
              updated_at: new Date(),
            },
          },
          { session }
        );
      }

      // 🔵 Step 2: Insert new document
      const doc = {
        image_url,
        text_color,
        overlay_color: overlay_color || null,
        overlay_opacity:
          typeof overlay_opacity === "number" ? overlay_opacity : null,
        priority: Number.isInteger(priority) ? priority : 0,
        is_active: typeof is_active === "boolean" ? is_active : true,
        is_welcome: is_welcome === true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const result = await collection.insertOne(doc, { session });

      res.status(201).json({
        message: "Background image created",
        id: result.insertedId.toString(),
      });
    });
  } catch (err) {
    console.error("Error creating background image:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  } finally {
    await session.endSession();
  }
});


module.exports = backgroundImagesRouter;
