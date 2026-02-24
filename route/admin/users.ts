import { Router, Request, Response } from "express";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { connectDB } from "../../db";

const router = Router();

/**
 * GET /admin/users
 * List all users
 */
router.get("/", async (_req: Request, res: Response) => {
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
router.post("/", async (req: Request, res: Response) => {
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

    const newUser: any = {
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
router.put("/:id", async (req: Request, res: Response) => {
  const { role, status, emailVerified, password } = req.body;
  const userId = req.params.id;

  try {
    const db = await connectDB();
    const update: any = { updatedAt: new Date() };

    if (role) update.role = role;
    if (status) update.status = status;
    if (typeof emailVerified === "boolean")
      update.emailVerified = emailVerified;
    if (password) {
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    const result: any = await db
      .collection("users")
      .findOneAndUpdate(
        { _id: new ObjectId(userId as string) },
        { $set: update },
        { returnDocument: "after", projection: { passwordHash: 0 } },
      );

    if (!result) {
      return res.status(404).json({ error: "User not found" });
    }

    const doc = result.value !== undefined ? result.value : result;
    res.json(doc);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ error: "Failed to update user" });
  }
});

/**
 * DELETE /admin/users/:id
 * Delete a user
 */
router.delete("/:id", async (req: Request, res: Response) => {
  const userId = req.params.id;

  try {
    const db = await connectDB();
    const result = await db
      .collection("users")
      .deleteOne({ _id: new ObjectId(userId as string) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({ success: true, message: "User deleted" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

export default router;
