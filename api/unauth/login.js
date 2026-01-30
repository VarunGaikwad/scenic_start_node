const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { connectDB } = require("../../db");

const loginRouter = require("express").Router();

loginRouter.post("/", async (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email required" });
  }

  try {
    const db = await connectDB();
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db
      .collection("users")
      .findOne({ email: normalizedEmail });

    // 🔍 EXISTENCE CHECK MODE (email only)
    if (!password) {
      return res.status(200).json({
        exists: Boolean(user),
      });
    }

    // 🔐 LOGIN / AUTO-REGISTER MODE
    let authUser = user;

    if (!authUser) {
      // 🆕 REGISTER
      const passwordHash = await bcrypt.hash(password, 12);

      const newUser = {
        email: normalizedEmail,
        passwordHash,
        status: "active",
        name: null,
        createdAt: new Date(),
        lastLoginAt: new Date(),
      };

      const result = await db.collection("users").insertOne(newUser);

      authUser = {
        _id: result.insertedId,
        ...newUser,
      };
    } else {
      // 🔐 LOGIN
      if (authUser.status !== "active") {
        return res.status(403).json({ message: "Account not active" });
      }

      const isMatch = await bcrypt.compare(password, authUser.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      await db
        .collection("users")
        .updateOne(
          { _id: authUser._id },
          { $set: { lastLoginAt: new Date() } },
        );
    }

    // 🎟 JWT
    const token = jwt.sign(
      {
        sub: authUser._id.toString(),
        email: authUser.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" },
    );

    return res.status(200).json({
      token,
      user: {
        _id: authUser._id,
        email: authUser.email,
        name: authUser.name,
      },
    });
  } catch (err) {
    console.error(err);

    // Handle duplicate email race condition
    if (err.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }

    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = loginRouter;
