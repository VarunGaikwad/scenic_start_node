"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const mongodb_1 = require("mongodb");
const db_1 = require("../../db");
const router = (0, express_1.Router)();
/**
 * GET /admin/calendar-reminders
 * List all reminders
 */
router.get("/", async (req, res) => {
    const { userId } = req.query;
    const query = {};
    if (userId && typeof userId === "string") {
        try {
            query.userId = new mongodb_1.ObjectId(userId);
        }
        catch (e) {
            return res.status(400).json({ error: "Invalid userId" });
        }
    }
    try {
        const db = await (0, db_1.connectDB)();
        const items = await db
            .collection("calendar_reminders")
            .find(query)
            .sort({ createdAt: -1 })
            .limit(100)
            .toArray();
        res.json(items);
    }
    catch (err) {
        console.error("Error fetching reminders:", err);
        res.status(500).json({ error: "Failed to fetch items" });
    }
});
/**
 * POST /admin/calendar-reminders
 * Create a new reminder (Admin context, usually on behalf of users or system)
 */
router.post("/", async (req, res) => {
    const { type, title, userId, completed, description, dueDate, priority, reminderTime, location, } = req.body;
    if (!type || !title || !userId) {
        return res
            .status(400)
            .json({ error: "Type, title, and userId are required" });
    }
    try {
        const db = await (0, db_1.connectDB)();
        const newItem = {
            type,
            title,
            userId: new mongodb_1.ObjectId(userId),
            completed: completed || false,
            createdAt: new Date(),
            updatedAt: new Date(),
            description,
            priority,
            location,
        };
        if (dueDate)
            newItem.dueDate = new Date(dueDate);
        if (reminderTime)
            newItem.reminderTime = new Date(reminderTime);
        const result = await db.collection("calendar_reminders").insertOne(newItem);
        res.status(201).json({ ...newItem, _id: result.insertedId });
    }
    catch (err) {
        console.error("Error creating item:", err);
        res.status(500).json({ error: "Failed to create item" });
    }
});
/**
 * PUT /admin/calendar-reminders/:id
 * Update a reminder
 */
router.put("/:id", async (req, res) => {
    const id = req.params.id;
    const { type, title, completed, description, dueDate, priority, reminderTime, location, } = req.body;
    try {
        const db = await (0, db_1.connectDB)();
        const update = { updatedAt: new Date() };
        if (type)
            update.type = type;
        if (title)
            update.title = title;
        if (completed !== undefined)
            update.completed = completed;
        if (description !== undefined)
            update.description = description;
        if (dueDate)
            update.dueDate = new Date(dueDate);
        if (priority)
            update.priority = priority;
        if (reminderTime)
            update.reminderTime = new Date(reminderTime);
        if (location !== undefined)
            update.location = location;
        const result = await db
            .collection("calendar_reminders")
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
 * DELETE /admin/calendar-reminders/:id
 * Delete a reminder
 */
router.delete("/:id", async (req, res) => {
    const id = req.params.id;
    try {
        const db = await (0, db_1.connectDB)();
        const result = await db
            .collection("calendar_reminders")
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
