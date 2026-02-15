const express = require("express");
const { ObjectId } = require("mongodb");
const { connectDB } = require("../../db");

const router = express.Router();

/**
 * GET /admin/bookmarks
 * List all bookmarks (optionally filter by userId)
 */
router.get("/", async (req, res) => {
    const { userId, type } = req.query;
    const query = {};

    if (userId) {
        try {
            query.userId = new ObjectId(userId);
        } catch (e) {
            return res.status(400).json({ error: "Invalid userId" });
        }
    }
    if (type) {
        query.type = type;
    }

    try {
        const db = await connectDB();
        const bookmarks = await db
            .collection("bookmarks")
            .find(query)
            .sort({ createdAt: -1 })
            .toArray();

        res.json(bookmarks);
    } catch (err) {
        console.error("Error fetching bookmarks:", err);
        res.status(500).json({ error: "Failed to fetch bookmarks" });
    }
});

/**
 * GET /admin/bookmarks/:id
 * Get a single bookmark by ID
 */
router.get("/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const db = await connectDB();
        const bookmark = await db
            .collection("bookmarks")
            .findOne({ _id: new ObjectId(id) });

        if (!bookmark) {
            return res.status(404).json({ error: "Bookmark not found" });
        }

        res.json(bookmark);
    } catch (err) {
        console.error("Error fetching bookmark:", err);
        res.status(500).json({ error: "Failed to fetch bookmark" });
    }
});

/**
 * PUT /admin/bookmarks/:id
 * Update a bookmark
 */
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const { title, url, parentId } = req.body;

    if (!title) {
        return res.status(400).json({ error: "Title is required" });
    }

    try {
        const db = await connectDB();
        const updateData = {
            $set: {
                title,
                url: url || null,
                parentId: parentId ? new ObjectId(parentId) : null,
            },
        };

        const result = await db.collection("bookmarks").updateOne(
            { _id: new ObjectId(id) },
            updateData
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: "Bookmark not found" });
        }

        const updatedBookmark = await db.collection("bookmarks").findOne({ _id: new ObjectId(id) });
        res.json(updatedBookmark);

    } catch (err) {
        console.error("Error updating bookmark:", err);
        res.status(500).json({ error: "Failed to update bookmark" });
    }
});


/**
 * DELETE /admin/bookmarks/:id
 * Delete a bookmark
 */
router.delete("/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const db = await connectDB();
        const result = await db
            .collection("bookmarks")
            .deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "Bookmark not found" });
        }

        res.json({ success: true, message: "Bookmark deleted" });
    } catch (err) {
        console.error("Error deleting bookmark:", err);
        res.status(500).json({ error: "Failed to delete bookmark" });
    }
});

module.exports = router;
