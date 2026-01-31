const { connectDB } = require("../../db");
const { ObjectId } = require("mongodb");

const todaysEventsRouter = require("express").Router();

/**
 * @swagger
 * /api/auth/todays-events:
 *   get:
 *     summary: Get today's birthday events
 *     description: Returns active birthday reminders matching today's UTC date
 *     tags:
 *       - Events
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Today's events
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 date:
 *                   type: string
 *                   example: "2026-01-31"
 *                 events:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                       birthDate:
 *                         type: string
 *                         format: date
 *                       note:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */

todaysEventsRouter.get("/", async (req, res) => {
  try {
    const db = await connectDB();

    const today = new Date();

    const year = today.getUTCFullYear();
    const month = today.getUTCMonth() + 1;
    const day = today.getUTCDate();

    const leapYear =
      year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

    const matchConditions = [
      // Normal birthdays
      {
        $and: [
          { $eq: [{ $month: "$birthDate" }, month] },
          { $eq: [{ $dayOfMonth: "$birthDate" }, day] },
        ],
      },
    ];

    // 🎯 Feb 29 handling (celebrate on Feb 28 in non-leap years)
    if (!leapYear && month === 2 && day === 28) {
      matchConditions.push({
        $and: [
          { $eq: [{ $month: "$birthDate" }, 2] },
          { $eq: [{ $dayOfMonth: "$birthDate" }, 29] },
        ],
      });
    }

    const events = await db
      .collection("birthday_reminders")
      .find({
        userId: new ObjectId(req.user.sub),
        isActive: true,
        $expr: {
          $or: matchConditions,
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
