const { ObjectId } = require("mongodb");
const { connectDB } = require("../../db");

const meRouter = require("express").Router();

meRouter.get("/", async (req, res) => {
  try {
    const db = await connectDB();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(req.user.sub) },
      {
        projection: {
          passwordHash: 0,
          passwordReset: 0,
        },
      },
    );

    if (!user) {
      // Token valid but user deleted → force logout
      return res.status(401).json({ message: "User not found" });
    }

    if (user.status !== "active") {
      return res.status(403).json({ message: "Account not active" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = meRouter;
