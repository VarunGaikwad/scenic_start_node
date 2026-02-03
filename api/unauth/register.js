const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB } = require("../../db");

const registerRouter = require("express").Router();

/**
 * @swagger
 * /unauth/register:
 *   post:
 *     summary: Register a new user
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 example: StrongPass123
 *     responses:
 *       201:
 *         description: User registered successfully
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error
 */
registerRouter.post("/", async (req, res) => {
  const { email, password } = req.body;

  // Hard validation
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

    // OPTIONAL but recommended: pre-check
    const existing = await db
      .collection("users")
      .findOne({ email: normalizedEmail });

    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.collection("users").insertOne({
      email: normalizedEmail,
      passwordHash,
      status: "active",
      name: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    });

    const token = jwt.sign(
      {
        sub: result.insertedId.toString(),
        email: normalizedEmail,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
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
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }

    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = registerRouter;
