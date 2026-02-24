import { Router, Request, Response } from "express";
import { connectDB } from "../../db";
import { ObjectId, Db } from "mongodb";
import { AuthRequest } from "../../middleware";

const ERROR_CODES = {
  INVALID_PARENT: "INVALID_PARENT",
  CIRCULAR_REFERENCE: "CIRCULAR_REFERENCE",
};

/**
 * Validates that a parent folder exists and belongs to the user
 */
async function validateParent(db: Db, userId: ObjectId, parentId: string) {
  if (!parentId) return null;

  const parent = await db.collection("bookmarks").findOne({
    _id: new ObjectId(parentId as string),
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
async function checkCircularReference(
  db: Db,
  userId: ObjectId,
  itemId: ObjectId,
  newParentId: string,
) {
  let currentId: ObjectId | null | string = newParentId;

  while (currentId) {
    if (currentId.toString() === itemId.toString()) {
      return true; // Circular reference detected
    }

    const parent = await db.collection("bookmarks").findOne({
      _id: new ObjectId(currentId as string),
      userId,
    });

    if (!parent) break;
    currentId = parent.parentId;
  }

  return false;
}

/**
 * Recursively gets all descendant bookmark IDs for a given folder.
 */
async function getAllDescendantIds(
  db: Db,
  userId: ObjectId,
  folderId: ObjectId,
) {
  const ids: ObjectId[] = [];
  const queue = [folderId];

  while (queue.length > 0) {
    const currentFolderId = queue.shift()!;
    const children = await db
      .collection("bookmarks")
      .find({ userId, parentId: currentFolderId })
      .project({ _id: 1, type: 1 })
      .toArray();

    for (const child of children) {
      ids.push(child._id as ObjectId);
      if (child.type === "folder") {
        queue.push(child._id as ObjectId);
      }
    }
  }
  return ids;
}

const bookmarksRouter = Router();

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
 */
bookmarksRouter.get("/tree", async (req: AuthRequest, res: Response) => {
  try {
    const db = await connectDB();
    const userId = new ObjectId(req.user?.id as string);

    const items = await db
      .collection("bookmarks")
      .find({ userId })
      .sort({ createdAt: 1 })
      .toArray();

    const map: any = {};
    const roots: any[] = [];

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
 */
bookmarksRouter.get("/", async (req: AuthRequest, res: Response) => {
  const userId = req.user?.id;
  const parentId = req.query.parentId as string | undefined;

  try {
    const db = await connectDB();
    const filter: any = { userId: new ObjectId(userId as string) };

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
 */
bookmarksRouter.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const db = await connectDB();
    const item = await db.collection("bookmarks").findOne({
      _id: new ObjectId(req.params.id as string),
      userId: new ObjectId(req.user?.id as string),
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
 */
bookmarksRouter.post("/", async (req: AuthRequest, res: Response) => {
  const { type, title, parentId = null, url, widgetType } = req.body;
  const userId = new ObjectId(req.user?.id as string);

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
      url,
      createdAt: new Date(),
      widgetType,
    };

    const result = await db.collection("bookmarks").insertOne(newItem);

    res.status(201).json({ ...newItem, _id: result.insertedId });
  } catch (err: any) {
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
 */
bookmarksRouter.put("/:id", async (req: AuthRequest, res: Response) => {
  const { title, url, parentId } = req.body;
  const userId = new ObjectId(req.user?.id as string);
  const itemId = new ObjectId(req.params.id as string);

  if (title === undefined && url === undefined && parentId === undefined) {
    return res.status(400).json({ error: "Nothing to update" });
  }

  try {
    const db = await connectDB();

    const itemToUpdate = await db.collection("bookmarks").findOne({
      _id: itemId,
      userId,
    });

    if (!itemToUpdate) {
      return res.status(404).json({ error: "Item not found" });
    }

    const update: any = { $set: {} };

    if (parentId !== undefined) {
      if (itemId.toString() === parentId) {
        return res.status(400).json({ error: "Item cannot be its own parent" });
      }

      if (parentId !== null) {
        await validateParent(db, userId, parentId);

        if (itemToUpdate.type === "folder") {
          const isCircular = await checkCircularReference(
            db,
            userId,
            itemId,
            parentId,
          );
          if (isCircular) {
            return res.status(400).json({
              error: "Cannot move folder - would create circular reference",
            });
          }
        }
      }
      update.$set.parentId = parentId ? new ObjectId(parentId) : null;
    }

    if (title !== undefined) {
      update.$set.title = title;
    }
    if (url !== undefined && itemToUpdate.type === "link") {
      update.$set.url = url;
    }

    const result: any = await db
      .collection("bookmarks")
      .findOneAndUpdate({ _id: itemId, userId }, update, {
        returnDocument: "after",
      });

    const doc = result.value !== undefined ? result.value : result;
    res.json(doc);
  } catch (err: any) {
    if (err.message === ERROR_CODES.INVALID_PARENT) {
      return res.status(400).json({ error: "Invalid parent folder" });
    }
    if (err.code === 11000) {
      return res.status(400).json({
        error: "An item with this title already exists in the target folder.",
      });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to update item" });
  }
});

/**
 * @swagger
 * /auth/bookmark/{id}:
 */
bookmarksRouter.delete("/:id", async (req: AuthRequest, res: Response) => {
  const userId = new ObjectId(req.user?.id as string);
  const itemId = new ObjectId(req.params.id as string);

  try {
    const db = await connectDB();

    const itemToDelete = await db.collection("bookmarks").findOne({
      _id: itemId,
      userId,
    });

    if (!itemToDelete) {
      return res.status(404).json({ error: "Item not found" });
    }

    const idsToDelete = [itemId];

    if (itemToDelete.type === "folder") {
      const descendantIds = await getAllDescendantIds(db, userId, itemId);
      idsToDelete.push(...descendantIds);
    }

    const result = await db.collection("bookmarks").deleteMany({
      _id: { $in: idsToDelete },
      userId,
    });

    res.json({ success: true, deletedCount: result.deletedCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

export default bookmarksRouter;
