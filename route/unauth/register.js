const bcrypt = require("bcrypt");
const { connectDB } = require("../../db");

const registerRouter = require("express").Router();


/**
 * @swagger
 * /unauth/register:
 *   post:
 *     summary: Register a new user
 *     description: >
 *       Creates a new user account.
 *       This endpoint does NOT authenticate the user and does NOT return a JWT.
 *       Use /unauth/login after successful registration.
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
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 minLength: 8
 *                 maxLength: 128
 *                 example: StrongPass123!
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: 65c1e8f4c2a1b23a9d8f1234
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *       400:
 *         description: Invalid input
 *       409:
 *         description: Email already registered
 *       500:
 *         description: Internal server error
 */
registerRouter.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password required" });
  }

  if (password.length < 8 || password.length > 128) {
    return res
      .status(400)
      .json({ message: "Password must be 8–128 characters" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const db = await connectDB();

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await db.collection("users").insertOne({
      email: normalizedEmail,
      passwordHash,
      status: "active",
      role: "user",
      authVersion: 1,
      name: null,
      createdAt: new Date(),
      lastLoginAt: null,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: result.insertedId.toString(),
        email: normalizedEmail,
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: "Email already registered" });
    }

    console.error("Register error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = registerRouter;
