const { connectDB } = require("../../db");
const { ObjectId } = require("mongodb");

const todaysEventsRouter = require("express").Router();

/**
 * ------------------------------------
 * GET today's events
 * ------------------------------------
 * Returns:
 * {
 *   date: "YYYY-MM-DD",
 *   events: []
 * }
 * ------------------------------------
 */
todaysEventsRouter.get("/", async (req, res) => {
  try {
    const db = await connectDB();

    const today = new Date();

    // Use UTC to avoid timezone bugs
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();

    const events = await db
      .collection("birthday_reminders")
      .find({
        userId: new ObjectId(req.user.sub),
        isActive: true,
        $expr: {
          $and: [
            { $eq: [{ $month: "$birthDate" }, month] },
            { $eq: [{ $dayOfMonth: "$birthDate" }, day] },
          ],
        },
      })
      .project({
        name: 1,
        birthDate: 1,
        note: 1,
      })
      .toArray();

    res.status(200).json({
      date: today.toISOString().slice(0, 10),
      events,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = todaysEventsRouter;
