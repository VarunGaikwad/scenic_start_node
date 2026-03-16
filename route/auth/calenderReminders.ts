import { Router, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { connectDB } from "../../db";

const calendarReminderRouter = Router();

/**
 * @swagger
 * tags:
 *   name: CalendarReminders
 *   description: Calendar reminder management
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     CalendarReminder:
 *       type: object
 *       required:
 *         - type
 *         - title
 *         - createdAt
 *         - userId
 *         - completed
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ObjectId
 *         userId:
 *           type: string
 *           description: The ObjectId of the user
 *         type:
 *           type: string
 *           enum: [task, event, birthday]
 *           description: Type of reminder
 *         title:
 *           type: string
 *           minLength: 1
 *           description: Title of the reminder
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         completed:
 *           type: boolean
 *           description: Completion status
 *         date:
 *           type: string
 *           example: "2026-03-16"
 *           description: ISO date string for the reminder (YYYY-MM-DD)
 *         time:
 *           type: string
 *           example: "10:04"
 *           description: Time string in HH:mm format
 *         description:
 *           type: string
 *           description: Additional information
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *           description: Priority level
 *         location:
 *           type: string
 *           description: Location for the event or birthday
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last updated timestamp
 *     CreateReminderRequest:
 *       type: object
 *       required:
 *         - type
 *         - title
 *         - createdAt
 *         - userId
 *         - completed
 *       properties:
 *         userId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [task, event, birthday]
 *         title:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         completed:
 *           type: boolean
 *         date:
 *           type: string
 *           example: "2026-03-16"
 *         time:
 *           type: string
 *           example: "10:04"
 *         description:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *         location:
 *           type: string
 *     UpdateReminderRequest:
 *       type: object
 *       required:
 *         - type
 *         - title
 *         - completed
 *       properties:
 *         type:
 *           type: string
 *           enum: [task, event, birthday]
 *         title:
 *           type: string
 *         completed:
 *           type: boolean
 *         date:
 *           type: string
 *           example: "2026-03-16"
 *         time:
 *           type: string
 *           example: "10:04"
 *         description:
 *           type: string
 *         priority:
 *           type: string
 *           enum: [low, medium, high]
 *         location:
 *           type: string
 */

// ─── CREATE ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/calendar-reminder:
 *   post:
 *     summary: Create a new calendar reminder
 *     tags: [CalendarReminders]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateReminderRequest'
 *           example:
 *             userId: "660f1b2e3a4b5c6d7e8f9a0b"
 *             type: "birthday"
 *             title: "My Birthday"
 *             createdAt: "2026-03-16T00:00:00.000Z"
 *             completed: false
 *             date: "2026-03-16"
 *             time: "10:04"
 *             description: "Annual birthday reminder"
 *             priority: "high"
 *             location: "Home"
 *     responses:
 *       201:
 *         description: Reminder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reminder created
 *                 reminderId:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Server error
 */
calendarReminderRouter.post("/", async (req: Request, res: Response) => {
  const {
    type,
    title,
    createdAt,
    userId,
    completed,
    date,
    time,
    description,
    priority,
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
      date: date ?? null,
      time: time ?? null,
      description: description ?? null,
      priority: priority ?? null,
      location: location ?? null,
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

// ─── GET BY ID ────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/calendar-reminder/{id}:
 *   get:
 *     summary: Get a reminder by ID
 *     tags: [CalendarReminders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ObjectId
 *     responses:
 *       200:
 *         description: Reminder found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CalendarReminder'
 *       404:
 *         description: Reminder not found
 *       500:
 *         description: Server error
 */
calendarReminderRouter.get("/:id", async (req: Request, res: Response) => {
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

// ─── UPDATE ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/calendar-reminder/{id}:
 *   put:
 *     summary: Update a reminder by ID
 *     tags: [CalendarReminders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateReminderRequest'
 *           example:
 *             type: "task"
 *             title: "Updated Task"
 *             completed: true
 *             date: "2026-04-01"
 *             time: "09:00"
 *             priority: "medium"
 *     responses:
 *       200:
 *         description: Reminder updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reminder updated
 *       400:
 *         description: Missing required fields
 *       404:
 *         description: Reminder not found
 *       500:
 *         description: Server error
 */
calendarReminderRouter.put("/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    type,
    title,
    completed,
    date,
    time,
    description,
    priority,
    location,
  } = req.body;

  if (!type || !title || completed === undefined) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const updatedReminder = {
      type,
      title,
      completed,
      date: date ?? null,
      time: time ?? null,
      description: description ?? null,
      priority: priority ?? null,
      location: location ?? null,
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

// ─── DELETE ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/calendar-reminder/{id}:
 *   delete:
 *     summary: Delete a reminder by ID
 *     tags: [CalendarReminders]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Reminder ObjectId
 *     responses:
 *       200:
 *         description: Reminder deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reminder deleted
 *       404:
 *         description: Reminder not found
 *       500:
 *         description: Server error
 */
calendarReminderRouter.delete("/:id", async (req: Request, res: Response) => {
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

// ─── GET ALL BY USER ──────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/calendar-reminder/user/{userId}:
 *   get:
 *     summary: Get all reminders for a user
 *     tags: [CalendarReminders]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ObjectId
 *     responses:
 *       200:
 *         description: List of reminders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CalendarReminder'
 *       404:
 *         description: No reminders found for this user
 *       500:
 *         description: Server error
 */
calendarReminderRouter.get(
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

// ─── GET DUE TODAY ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /auth/calendar-reminder/due/today:
 *   get:
 *     summary: Get all reminders due today
 *     tags: [CalendarReminders]
 *     responses:
 *       200:
 *         description: List of reminders due today
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/CalendarReminder'
 *       404:
 *         description: No reminders due today
 *       500:
 *         description: Server error
 */
calendarReminderRouter.get(
  "/due/today",
  async (_req: Request, res: Response) => {
    const today = new Date().toISOString().split("T")[0]; // "2026-03-16"

    try {
      const db = await connectDB();
      const calendarCollection = db.collection("calendar_reminders");

      const reminders = await calendarCollection
        .find({ date: today })
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

export default calendarReminderRouter;
