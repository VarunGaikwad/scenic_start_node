const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB } = require("../../db");

const registerRouter = require("express").Router();

registerRouter.post("/register", async (req, res) => {
  const { email, password } = req.body;

  // Hard validation — registration is explicit
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password required" });
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: "Password must be at least 8 characters" });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const db = await connectDB();

    const passwordHash = await bcrypt.hash(password, 12);

    const newUser = {
      email: normalizedEmail,
      passwordHash,
      status: "active", // change later if you add email verification
      name: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };

    const result = await db.collection("users").insertOne(newUser);

    const token = jwt.sign(
      {
        sub: result.insertedId.toString(),
        email: normalizedEmail,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    return res.status(201).json({
      token,
      user: {
        _id: result.insertedId,
        email: normalizedEmail,
        name: null,
      },
    });
  } catch (err) {
    // Duplicate email (unique index required!)
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = registerRouter;
