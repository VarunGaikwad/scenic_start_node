const { connectDB } = require("../../db");
const { ObjectId } = require("mongodb");

const favoriteLinksRouter = require("express").Router();

/**
 * @swagger
 * /auth/favorite-links:
 *   get:
 *     summary: Get all favorite links/folders for the logged-in user
 *     tags:
 *       - Favorite Links
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: parentId
 *         required: false
 *         schema:
 *           type: string
 *           nullable: true
 *         description: Filter by parent folder ID, use "null" for top-level
 *     responses:
 *       200:
 *         description: List of favorite links/folders
 *       401:
 *         description: Unauthorized
 */
favoriteLinksRouter.get("/", async (req, res) => {
  const userId = req.user.id;
  const parentId = req.query.parentId;

  try {
    const db = await connectDB();
    const filter = { userId: new ObjectId(userId) };

    if (parentId) {
      filter.parentId = new ObjectId(parentId);
    } else if (parentId === "null") {
      filter.parentId = null;
    }

    const items = await db.collection("favorite_links").find(filter).toArray();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch favorite links" });
  }
});

/**
 * @swagger
 * /favorite-links/{id}:
 *   get:
 *     summary: Get a single favorite link/folder by ID
 *     tags:
 *       - Favorite Links
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the favorite link/folder
 *     responses:
 *       200:
 *         description: Favorite link/folder object
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
favoriteLinksRouter.get("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const item = await db.collection("favorite_links").findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.user.id),
    });

    if (!item) return res.status(404).json({ error: "Item not found" });
    res.json(item);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch item" });
  }
});

/**
 * @swagger
 * /auth/favorite-links:
 *   post:
 *     summary: Create a new link or folder
 *     tags:
 *       - Favorite Links
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - title
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [folder, link]
 *               title:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 nullable: true
 *               url:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       201:
 *         description: Created favorite link/folder
 *       400:
 *         description: Validation or duplicate error
 *       401:
 *         description: Unauthorized
 */
favoriteLinksRouter.post("/", async (req, res) => {
  const { type, title, parentId = null, url } = req.body;

  if (!type || !title)
    return res.status(400).json({ error: "type and title are required" });
  if (type === "link" && !url)
    return res.status(400).json({ error: "URL is required for links" });

  try {
    const db = await connectDB();
    const newItem = {
      userId: new ObjectId(req.user.id),
      type,
      title,
      parentId: parentId ? new ObjectId(parentId) : null,
      url: url || null,
      createdAt: new Date(),
    };

    const result = await db.collection("favorite_links").insertOne(newItem);
    res.status(201).json(result.ops[0]);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      res.status(400).json({ error: "Duplicate title in the same folder" });
    } else {
      res.status(500).json({ error: "Failed to create item" });
    }
  }
});

/**
 * @swagger
 * /auth/favorite-links/{id}:
 *   put:
 *     summary: Update a favorite link/folder
 *     tags:
 *       - Favorite Links
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               parentId:
 *                 type: string
 *                 nullable: true
 *               url:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Updated favorite link/folder
 *       400:
 *         description: Validation or duplicate error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
favoriteLinksRouter.put("/:id", async (req, res) => {
  const { title, url, parentId } = req.body;

  if (!title && !url && parentId === undefined)
    return res.status(400).json({ error: "Nothing to update" });

  try {
    const db = await connectDB();
    const update = {};
    if (title) update.title = title;
    if (url !== undefined) update.url = url;
    if (parentId !== undefined)
      update.parentId = parentId ? new ObjectId(parentId) : null;

    const result = await db
      .collection("favorite_links")
      .findOneAndUpdate(
        { _id: new ObjectId(req.params.id), userId: new ObjectId(req.user.id) },
        { $set: update },
        { returnDocument: "after" },
      );

    if (!result.value) return res.status(404).json({ error: "Item not found" });
    res.json(result.value);
  } catch (err) {
    console.error(err);
    if (err.code === 11000) {
      res.status(400).json({ error: "Duplicate title in the same folder" });
    } else {
      res.status(500).json({ error: "Failed to update item" });
    }
  }
});

/**
 * @swagger
 * /auth/favorite-links/{id}:
 *   delete:
 *     summary: Delete a favorite link/folder
 *     tags:
 *       - Favorite Links
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Favorite link/folder deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Item not found
 */
favoriteLinksRouter.delete("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const result = await db.collection("favorite_links").deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.user.id),
    });

    if (result.deletedCount === 0)
      return res.status(404).json({ error: "Item not found" });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = favoriteLinksRouter;
