const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB } = require("../../db");

const loginRouter = require("express").Router();

loginRouter.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ message: "Email and password required" });
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    const db = await connectDB();

    const user = await db.collection("users").findOne({
      email: normalizedEmail,
    });

    if (!user || user.status !== "active") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    await db
      .collection("users")
      .updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    const token = jwt.sign(
      {
        sub: user._id.toString(),
        email: user.email,
        role: user.role ?? "user",
      },
      process.env.JWT_SECRET,
      {
        algorithm: "HS256",
        issuer: process.env.JWT_ISSUER,
        audience: process.env.JWT_AUDIENCE,
      },
    );

    res.cookie("accessToken", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24,
    });

    return res.status(200).json({
      user: {
        id: user._id.toString(),
        email: user.email,
        role: user.role ?? "user",
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = loginRouter;
