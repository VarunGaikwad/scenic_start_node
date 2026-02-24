"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../../db");
const mongodb_1 = require("mongodb");
const ERROR_CODES = {
    INVALID_PARENT: "INVALID_PARENT",
    CIRCULAR_REFERENCE: "CIRCULAR_REFERENCE",
};
/**
 * Validates that a parent folder exists and belongs to the user
 */
async function validateParent(db, userId, parentId) {
    if (!parentId)
        return null;
    const parent = await db.collection("bookmarks").findOne({
        _id: new mongodb_1.ObjectId(parentId),
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
            _id: new mongodb_1.ObjectId(currentId),
            userId,
        });
        if (!parent)
            break;
        currentId = parent.parentId;
    }
    return false;
}
/**
 * Recursively gets all descendant bookmark IDs for a given folder.
 */
async function getAllDescendantIds(db, userId, folderId) {
    const ids = [];
    const queue = [folderId];
    while (queue.length > 0) {
        const currentFolderId = queue.shift();
        const children = await db
            .collection("bookmarks")
            .find({ userId, parentId: currentFolderId })
            .project({ _id: 1, type: 1 })
            .toArray();
        for (const child of children) {
            ids.push(child._id);
            if (child.type === "folder") {
                queue.push(child._id);
            }
        }
    }
    return ids;
}
const bookmarksRouter = (0, express_1.Router)();
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
bookmarksRouter.get("/tree", async (req, res) => {
    try {
        const db = await (0, db_1.connectDB)();
        const userId = new mongodb_1.ObjectId(req.user?.id);
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
            }
            else {
                roots.push(map[item._id.toString()]);
            }
        }
        res.json(roots);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch bookmark tree" });
    }
});
/**
 * @swagger
 * /auth/bookmark:
 */
bookmarksRouter.get("/", async (req, res) => {
    const userId = req.user?.id;
    const parentId = req.query.parentId;
    try {
        const db = await (0, db_1.connectDB)();
        const filter = { userId: new mongodb_1.ObjectId(userId) };
        if (parentId === "null") {
            filter.parentId = null;
        }
        else if (parentId) {
            filter.parentId = new mongodb_1.ObjectId(parentId);
        }
        const items = await db.collection("bookmarks").find(filter).toArray();
        res.json(items);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch favorite links" });
    }
});
/**
 * @swagger
 * /auth/bookmark/{id}:
 */
bookmarksRouter.get("/:id", async (req, res) => {
    try {
        const db = await (0, db_1.connectDB)();
        const item = await db.collection("bookmarks").findOne({
            _id: new mongodb_1.ObjectId(req.params.id),
            userId: new mongodb_1.ObjectId(req.user?.id),
        });
        if (!item)
            return res.status(404).json({ error: "Item not found" });
        res.json(item);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch item" });
    }
});
/**
 * @swagger
 * /auth/bookmark:
 */
bookmarksRouter.post("/", async (req, res) => {
    const { type, title, parentId = null, url, widgetType } = req.body;
    const userId = new mongodb_1.ObjectId(req.user?.id);
    if (!type || !title)
        return res.status(400).json({ error: "type and title are required" });
    if (type === "link" && !url)
        return res.status(400).json({ error: "URL is required for links" });
    try {
        const db = await (0, db_1.connectDB)();
        if (parentId) {
            await validateParent(db, userId, parentId);
        }
        const newItem = {
            userId,
            type,
            title,
            parentId: parentId ? new mongodb_1.ObjectId(parentId) : null,
            url,
            createdAt: new Date(),
            widgetType,
        };
        const result = await db.collection("bookmarks").insertOne(newItem);
        res.status(201).json({ ...newItem, _id: result.insertedId });
    }
    catch (err) {
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
bookmarksRouter.put("/:id", async (req, res) => {
    const { title, url, parentId } = req.body;
    const userId = new mongodb_1.ObjectId(req.user?.id);
    const itemId = new mongodb_1.ObjectId(req.params.id);
    if (title === undefined && url === undefined && parentId === undefined) {
        return res.status(400).json({ error: "Nothing to update" });
    }
    try {
        const db = await (0, db_1.connectDB)();
        const itemToUpdate = await db.collection("bookmarks").findOne({
            _id: itemId,
            userId,
        });
        if (!itemToUpdate) {
            return res.status(404).json({ error: "Item not found" });
        }
        const update = { $set: {} };
        if (parentId !== undefined) {
            if (itemId.toString() === parentId) {
                return res.status(400).json({ error: "Item cannot be its own parent" });
            }
            if (parentId !== null) {
                await validateParent(db, userId, parentId);
                if (itemToUpdate.type === "folder") {
                    const isCircular = await checkCircularReference(db, userId, itemId, parentId);
                    if (isCircular) {
                        return res.status(400).json({
                            error: "Cannot move folder - would create circular reference",
                        });
                    }
                }
            }
            update.$set.parentId = parentId ? new mongodb_1.ObjectId(parentId) : null;
        }
        if (title !== undefined) {
            update.$set.title = title;
        }
        if (url !== undefined && itemToUpdate.type === "link") {
            update.$set.url = url;
        }
        const result = await db
            .collection("bookmarks")
            .findOneAndUpdate({ _id: itemId, userId }, update, {
            returnDocument: "after",
        });
        res.json(result);
    }
    catch (err) {
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
bookmarksRouter.delete("/:id", async (req, res) => {
    const userId = new mongodb_1.ObjectId(req.user?.id);
    const itemId = new mongodb_1.ObjectId(req.params.id);
    try {
        const db = await (0, db_1.connectDB)();
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete item" });
    }
});
exports.default = bookmarksRouter;
