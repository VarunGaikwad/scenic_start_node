const { connectDB } = require("../../db");
const { ObjectId } = require("mongodb");

const ERROR_CODES = {
  INVALID_PARENT: "INVALID_PARENT",
  CIRCULAR_REFERENCE: "CIRCULAR_REFERENCE",
};

/**
 * Validates that a parent folder exists and belongs to the user
 */
async function validateParent(db, userId, parentId) {
  if (!parentId) return null;

  const parent = await db.collection("bookmarks").findOne({
    _id: new ObjectId(parentId),
    userId,
    type: "folder",
  });

  if (!parent) {
    throw new Error(ERROR_CODES.INVALID_PARENT);
  }

  return parent;
}

/**
 * Checks if moving an item to a new parent would create a circular reference
 */
async function checkCircularReference(db, userId, itemId, newParentId) {
  let currentId = newParentId;

  while (currentId) {
    if (currentId.toString() === itemId.toString()) {
      return true; // Circular reference detected
    }

    const parent = await db.collection("bookmarks").findOne({
      _id: new ObjectId(currentId),
      userId,
    });

    if (!parent) break;
    currentId = parent.parentId;
  }

  return false;
}

/**
 * Recursively get all descendant IDs of a folder
 */
async function getAllDescendantIds(db, userId, parentId) {
  const descendants = [];
  const children = await db
    .collection("bookmarks")
    .find({
      userId,
      parentId: new ObjectId(parentId),
    })
    .toArray();

  for (const child of children) {
    descendants.push(child._id);
    // Recursively get descendants of this child if it's a folder
    if (child.type === "folder") {
      const childDescendants = await getAllDescendantIds(
        db,
        userId,
        child._id.toString(),
      );
      descendants.push(...childDescendants);
    }
  }

  return descendants;
}

const bookmarksRouter = require("express").Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Bookmark:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: Unique identifier
 *         userId:
 *           type: string
 *           description: Owner's user ID
 *         type:
 *           type: string
 *           enum: [folder, link]
 *           description: Type of bookmark
 *         title:
 *           type: string
 *           description: Display title
 *         parentId:
 *           type: string
 *           nullable: true
 *           description: Parent folder ID (null for root level)
 *         url:
 *           type: string
 *           nullable: true
 *           description: URL (only for link type)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *     BookmarkTree:
 *       allOf:
 *         - $ref: '#/components/schemas/Bookmark'
 *         - type: object
 *           properties:
 *             children:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BookmarkTree'
 *     Error:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           description: Error message
 */

/**
 * @swagger
 * /auth/bookmark/tree:
 *   get:
 *     summary: Get all bookmarks as a nested tree
 *     description: Returns the complete bookmark hierarchy with nested children
 *     tags:
 *       - Favorite Links
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Bookmark tree structure
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/BookmarkTree'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
bookmarksRouter.get("/tree", async (req, res) => {
  try {
    const db = await connectDB();
    const userId = new ObjectId(req.user.id);

    const items = await db
      .collection("bookmarks")
      .find({ userId })
      .sort({ createdAt: 1 })
      .toArray();

    const map = {};
    const roots = [];

    // Step 1: Initialize map with all items
    for (const item of items) {
      map[item._id.toString()] = { ...item, children: [] };
    }

    // Step 2: Build tree structure
    for (const item of items) {
      if (item.parentId) {
        const parent = map[item.parentId.toString()];
        if (parent) {
          parent.children.push(map[item._id.toString()]);
        }
      } else {
        roots.push(map[item._id.toString()]);
      }
    }

    res.json(roots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch bookmark tree" });
  }
});

/**
 * @swagger
 * /auth/bookmark:
 *   get:
 *     summary: Get all favorite links/folders for the logged-in user
 *     description: Retrieve bookmarks, optionally filtered by parent folder
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
 *         description: Filter by parent folder ID, use "null" for top-level items
 *     responses:
 *       200:
 *         description: List of favorite links/folders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Bookmark'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
bookmarksRouter.get("/", async (req, res) => {
  const userId = req.user.id;
  const parentId = req.query.parentId;

  try {
    const db = await connectDB();
    const filter = { userId: new ObjectId(userId) };

    if (parentId === "null") {
      filter.parentId = null;
    } else if (parentId) {
      filter.parentId = new ObjectId(parentId);
    }

    const items = await db.collection("bookmarks").find(filter).toArray();
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch favorite links" });
  }
});

/**
 * @swagger
 * /auth/bookmark/{id}:
 *   get:
 *     summary: Get a single favorite link/folder by ID
 *     description: Retrieve a specific bookmark by its ID
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
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bookmark'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
bookmarksRouter.get("/:id", async (req, res) => {
  try {
    const db = await connectDB();
    const item = await db.collection("bookmarks").findOne({
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
 * /auth/bookmark:
 *   post:
 *     summary: Create a new link or folder
 *     description: Create a new bookmark (link) or folder
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
 *                 description: Type of item to create
 *               title:
 *                 type: string
 *                 description: Display title
 *               parentId:
 *                 type: string
 *                 nullable: true
 *                 description: Parent folder ID (null for root level)
 *               url:
 *                 type: string
 *                 nullable: true
 *                 description: URL (required if type is "link")
 *           examples:
 *             folder:
 *               value:
 *                 type: folder
 *                 title: My Bookmarks
 *                 parentId: null
 *             link:
 *               value:
 *                 type: link
 *                 title: Google
 *                 url: https://google.com
 *                 parentId: 507f1f77bcf86cd799439011
 *     responses:
 *       201:
 *         description: Created favorite link/folder
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bookmark'
 *       400:
 *         description: Validation error or duplicate title
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               missingFields:
 *                 value:
 *                   error: type and title are required
 *               missingUrl:
 *                 value:
 *                   error: URL is required for links
 *               invalidParent:
 *                 value:
 *                   error: Invalid parent folder
 *               duplicate:
 *                 value:
 *                   error: Duplicate title in the same folder
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
bookmarksRouter.post("/", async (req, res) => {
  const { type, title, parentId = null, url, children } = req.body;
  const userId = new ObjectId(req.user.id);

  if (!type || !title)
    return res.status(400).json({ error: "type and title are required" });

  if (type === "link" && !url)
    return res.status(400).json({ error: "URL is required for links" });

  try {
    const db = await connectDB();

    if (parentId) {
      await validateParent(db, userId, parentId);
    }

    const newItem = {
      userId,
      type,
      title,
      parentId: parentId ? new ObjectId(parentId) : null,
      url: type === "link" ? url : null,
      createdAt: new Date(),
      children: children || [],
    };

    const result = await db.collection("bookmarks").insertOne(newItem);

    res.status(201).json({ ...newItem, _id: result.insertedId });
  } catch (err) {
    if (err.message === ERROR_CODES.INVALID_PARENT) {
      return res.status(400).json({ error: "Invalid parent folder" });
    }
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "Duplicate title in the same folder" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to create item" });
  }
});

/**
 * @swagger
 * /auth/bookmark/{id}:
 *   put:
 *     summary: Update a favorite link/folder
 *     description: Update title, URL, or move to a different parent folder
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
 *         description: ID of the item to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: New title
 *               parentId:
 *                 type: string
 *                 nullable: true
 *                 description: New parent folder ID (null for root level)
 *               url:
 *                 type: string
 *                 nullable: true
 *                 description: New URL (for links only)
 *           examples:
 *             updateTitle:
 *               value:
 *                 title: Updated Title
 *             moveToFolder:
 *               value:
 *                 parentId: 507f1f77bcf86cd799439011
 *             moveToRoot:
 *               value:
 *                 parentId: null
 *     responses:
 *       200:
 *         description: Updated favorite link/folder
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Bookmark'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *             examples:
 *               noUpdate:
 *                 value:
 *                   error: Nothing to update
 *               selfParent:
 *                 value:
 *                   error: Item cannot be its own parent
 *               circularReference:
 *                 value:
 *                   error: Cannot move folder - would create circular reference
 *               invalidParent:
 *                 value:
 *                   error: Invalid parent folder
 *               duplicate:
 *                 value:
 *                   error: Duplicate title in the same folder
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
bookmarksRouter.put("/:id", async (req, res) => {
  const { title, url, parentId } = req.body;
  const userId = new ObjectId(req.user.id);
  const itemId = new ObjectId(req.params.id);

  if (!title && !url && parentId === undefined)
    return res.status(400).json({ error: "Nothing to update" });

  if (parentId === req.params.id) {
    return res.status(400).json({ error: "Item cannot be its own parent" });
  }

  try {
    const db = await connectDB();

    // Validate parent exists and is a folder
    if (parentId !== undefined && parentId !== null) {
      await validateParent(db, userId, parentId);

      // Check for circular reference
      const isCircular = await checkCircularReference(
        db,
        userId,
        itemId,
        parentId,
      );
      if (isCircular) {
        return res
          .status(400)
          .json({
            error: "Cannot move folder - would create circular reference",
          });
      }
    }

    const update = {};
    if (title) update.title = title;
    if (url !== undefined) update.url = url;
    if (parentId !== undefined)
      update.parentId = parentId ? new ObjectId(parentId) : null;

    const result = await db
      .collection("bookmarks")
      .findOneAndUpdate(
        { _id: itemId, userId },
        { $set: update },
        { returnDocument: "after" },
      );

    if (!result) return res.status(404).json({ error: "Item not found" });

    res.json(result);
  } catch (err) {
    if (err.message === ERROR_CODES.INVALID_PARENT) {
      return res.status(400).json({ error: "Invalid parent folder" });
    }
    if (err.code === 11000) {
      return res
        .status(400)
        .json({ error: "Duplicate title in the same folder" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * @swagger
 * /auth/bookmark/{id}:
 *   delete:
 *     summary: Delete a favorite link/folder
 *     description: Delete a bookmark or folder (folders are deleted with all their contents recursively)
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
 *         description: ID of the item to delete
 *     responses:
 *       200:
 *         description: Favorite link/folder deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 deletedCount:
 *                   type: integer
 *                   description: Total number of items deleted (including nested items)
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Item not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Server error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
bookmarksRouter.delete("/:id", async (req, res) => {
  const userId = new ObjectId(req.user.id);
  const itemId = new ObjectId(req.params.id);

  try {
    const db = await connectDB();

    // Check if item exists and belongs to user
    const item = await db.collection("bookmarks").findOne({
      _id: itemId,
      userId,
    });

    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    let totalDeleted = 0;

    // If it's a folder, get all descendants
    if (item.type === "folder") {
      const descendantIds = await getAllDescendantIds(
        db,
        userId,
        itemId.toString(),
      );

      // Delete all descendants
      if (descendantIds.length > 0) {
        const descendantsResult = await db.collection("bookmarks").deleteMany({
          _id: { $in: descendantIds },
          userId,
        });
        totalDeleted += descendantsResult.deletedCount;
      }
    }

    // Delete the item itself
    const result = await db.collection("bookmarks").deleteOne({
      _id: itemId,
      userId,
    });

    totalDeleted += result.deletedCount;

    res.json({
      success: true,
      deletedCount: totalDeleted,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

module.exports = bookmarksRouter;
