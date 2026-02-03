const { ObjectId } = require("mongodb");
const { connectDB } = require("../../db");

const meRouter = require("express").Router();

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *       401:
 *         description: Unauthorized or user not found
 *       403:
 *         description: Account not active
 */
meRouter.get("/", async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!ObjectId.isValid(req.user.id)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const db = await connectDB();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(req.user.id) },
      {
        projection: {
          passwordHash: 0,
          passwordReset: 0,
        },
      },
    );

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account not active" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = meRouter;
