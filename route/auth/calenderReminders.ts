import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../../db";

const calenderReminderRouter = Router();

/**
 * @swagger
 * /auth/calender-reminder:
 */
calenderReminderRouter.post("/", async (req: Request, res: Response) => {
  const {
    type,
    title,
    createdAt,
    userId,
    completed,
    description,
    dueDate,
    priority,
    reminderTime,
    location,
  } = req.body;

  if (!type || !title || !createdAt || !userId || completed === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const newReminder = {
      type,
      title,
      createdAt: new Date(createdAt),
      userId: new ObjectId(userId as string),
      completed,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      reminderTime: reminderTime ? new Date(reminderTime) : null,
      location,
      updatedAt: new Date(),
    };

    const result = await calendarCollection.insertOne(newReminder);
    res
      .status(201)
      .json({ message: "Reminder created", reminderId: result.insertedId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/calender-reminder/{id}:
 */
calenderReminderRouter.get("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const reminder = await calendarCollection.findOne({
      _id: new ObjectId(id as string),
    });

    if (!reminder) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.status(200).json(reminder);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/calender-reminder/{id}:
 */
calenderReminderRouter.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    type,
    title,
    completed,
    description,
    dueDate,
    priority,
    reminderTime,
    location,
  } = req.body;

  if (!type || !title || completed === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const updatedReminder: any = {
      type,
      title,
      completed,
      description,
      dueDate: dueDate ? new Date(dueDate) : null,
      priority,
      reminderTime: reminderTime ? new Date(reminderTime) : null,
      location,
      updatedAt: new Date(),
    };

    const result = await calendarCollection.updateOne(
      { _id: new ObjectId(id as string) },
      { $set: updatedReminder },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.status(200).json({ message: "Reminder updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/calender-reminder/{id}:
 */
calenderReminderRouter.delete("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const result = await calendarCollection.deleteOne({
      _id: new ObjectId(id as string),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Reminder not found" });
    }

    res.status(200).json({ message: "Reminder deleted" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * @swagger
 * /auth/calender-reminder/user/{userId}:
 */
calenderReminderRouter.get(
  "/user/:userId",
  async (req: Request, res: Response) => {
    const { userId } = req.params;

    try {
      const db = await connectDB();
      const calendarCollection = db.collection("calendar_reminders");

      const reminders = await calendarCollection
        .find({ userId: new ObjectId(userId as string) })
        .toArray();

      if (reminders.length === 0) {
        return res
          .status(404)
          .json({ error: "No reminders found for this user" });
      }

      res.status(200).json(reminders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

/**
 * @swagger
 * /auth/calender-reminder/due/today:
 */
calenderReminderRouter.get(
  "/due/today",
  async (_req: Request, res: Response) => {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    try {
      const db = await connectDB();
      const calendarCollection = db.collection("calendar_reminders");

      const reminders = await calendarCollection
        .find({
          dueDate: { $gte: startOfDay, $lte: endOfDay },
        })
        .toArray();

      if (reminders.length === 0) {
        return res.status(404).json({ error: "No reminders due today" });
      }

      res.status(200).json(reminders);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Server error" });
    }
  },
);

export default calenderReminderRouter;
