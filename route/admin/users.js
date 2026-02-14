const express = require("express");
const bcrypt = require("bcrypt");
const { ObjectId } = require("mongodb");
const { connectDB } = require("../../db");

const router = express.Router();

/**
 * GET /admin/users
 * List all users
 */
router.get("/", async (req, res) => {
    try {
        const db = await connectDB();
        const users = await db
            .collection("users")
            .find({})
            .project({ passwordHash: 0, "passwordReset.tokenHash": 0 }) // Exclude sensitive data
            .sort({ createdAt: -1 })
            .toArray();

        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

/**
 * POST /admin/users
 * Create a new user
 */
router.post("/", async (req, res) => {
    const { email, password, role, status } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const db = await connectDB();

        const existingUser = await db.collection("users").findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: "User already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const newUser = {
            email,
            passwordHash,
            role: role || "user",
            status: status || "active",
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const result = await db.collection("users").insertOne(newUser);

        const { passwordHash: _, ...userWithoutPassword } = newUser;
        res.status(201).json({ ...userWithoutPassword, _id: result.insertedId });
    } catch (err) {
        console.error("Error creating user:", err);
        res.status(500).json({ error: "Failed to create user" });
    }
});

/**
 * PUT /admin/users/:id
 * Update user details
 */
router.put("/:id", async (req, res) => {
    const { role, status, emailVerified, password } = req.body;
    const userId = req.params.id;

    try {
        const db = await connectDB();
        const update = { updatedAt: new Date() };

        if (role) update.role = role;
        if (status) update.status = status;
        if (typeof emailVerified === "boolean") update.emailVerified = emailVerified;
        if (password) {
            update.passwordHash = await bcrypt.hash(password, 10);
        }

        const result = await db
            .collection("users")
            .findOneAndUpdate(
                { _id: new ObjectId(userId) },
                { $set: update },
                { returnDocument: "after", projection: { passwordHash: 0 } }
            );

        if (!result) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(result);
    } catch (err) {
        console.error("Error updating user:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

/**
 * DELETE /admin/users/:id
 * Delete a user
 */
router.delete("/:id", async (req, res) => {
    const userId = req.params.id;

    try {
        const db = await connectDB();
        const result = await db
            .collection("users")
            .deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json({ success: true, message: "User deleted" });
    } catch (err) {
        console.error("Error deleting user:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

module.exports = router;
