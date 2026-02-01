const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB } = require("../../db");

const loginRouter = require("express").Router();
/**
 * @swagger
 * /api/unauth/login:
 *   post:
 *     summary: Login user
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
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 */
loginRouter.post("/", async (req, res) => {
  const { email, password } = req.body;

  // Hard fail: login requires both
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password required" });
  }

  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const db = await connectDB();

    const user = await db.collection("users").findOne({
      email: normalizedEmail,
    });

    // Do NOT reveal which part failed
    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } },
    );

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    return res.status(200).json({
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = loginRouter;
