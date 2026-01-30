const bcrypt = require("bcrypt");
const { connectDB } = require("../../db");

const registerRouter = require("express").Router();

registerRouter.post("/", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      message: "Password must be at least 8 characters",
    });
  }

  try {
    const db = await connectDB();

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db
      .collection("users")
      .findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    const user = {
      email: normalizedEmail,
      passwordHash,
      name: name?.trim() || null,
      status: "active", // or "pending" if you add email verification later
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: null,
      lastLoginAt: null,
    };

    const result = await db.collection("users").insertOne(user);

    // Never send passwordHash back
    delete user.passwordHash;

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: result.insertedId,
        ...user,
      },
    });
  } catch (err) {
    console.error(err);

    // Duplicate key safety net (race condition)
    if (err.code === 11000) {
      return res.status(409).json({
        message: "User already exists",
      });
    }

    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = registerRouter;
