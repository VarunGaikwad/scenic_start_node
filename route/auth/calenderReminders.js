const { ObjectId } = require("mongodb");
const { connectDB } = require("../../db");

const calenderReminderRouter = require("express").Router();

/**
 * @swagger
 * /auth/calender-reminder:
 *   post:
 *     summary: Create a new calendar reminder
 *     description: Adds a new reminder to the calendar.
 *     operationId: createReminder
 *     tags:
 *       - Reminders
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: ["task", "event", "birthday"]
 *               title:
 *                 type: string
 *               createdAt:
 *                 type: string
 *                 format: date-time
 *               userId:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *                 enum: ["low", "medium", "high"]
 *               reminderTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *             required:
 *               - type
 *               - title
 *               - createdAt
 *               - userId
 *               - completed
 *     responses:
 *       '201':
 *         description: Reminder created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 reminderId:
 *                   type: string
 *       '400':
 *         description: Missing required fields
 *       '500':
 *         description: Server error
 */
calenderReminderRouter.post("/", async (req, res) => {
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
      userId: new ObjectId(userId),
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
 *   get:
 *     summary: Get a specific calendar reminder
 *     description: Retrieves a calendar reminder by its ID.
 *     operationId: getReminder
 *     tags:
 *       - Reminders
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reminder.
 *     responses:
 *       '200':
 *         description: Reminder retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                 type:
 *                   type: string
 *                 title:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 userId:
 *                   type: string
 *                 completed:
 *                   type: boolean
 *                 description:
 *                   type: string
 *                 dueDate:
 *                   type: string
 *                   format: date-time
 *                 priority:
 *                   type: string
 *                 reminderTime:
 *                   type: string
 *                   format: date-time
 *                 location:
 *                   type: string
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       '404':
 *         description: Reminder not found
 *       '500':
 *         description: Server error
 */
calenderReminderRouter.get("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const reminder = await calendarCollection.findOne({
      _id: new ObjectId(id),
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
 *   put:
 *     summary: Update a calendar reminder
 *     description: Updates an existing reminder.
 *     operationId: updateReminder
 *     tags:
 *       - Reminders
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reminder to be updated.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: ["task", "event", "birthday"]
 *               title:
 *                 type: string
 *               completed:
 *                 type: boolean
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *                 enum: ["low", "medium", "high"]
 *               reminderTime:
 *                 type: string
 *                 format: date-time
 *               location:
 *                 type: string
 *             required:
 *               - type
 *               - title
 *               - completed
 *     responses:
 *       '200':
 *         description: Reminder updated successfully
 *       '404':
 *         description: Reminder not found
 *       '500':
 *         description: Server error
 */
calenderReminderRouter.put("/:id", async (req, res) => {
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

    const updatedReminder = {
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
      { _id: new ObjectId(id) },
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
 *   delete:
 *     summary: Delete a calendar reminder
 *     description: Deletes a calendar reminder by its ID.
 *     operationId: deleteReminder
 *     tags:
 *       - Reminders
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the reminder to be deleted.
 *     responses:
 *       '200':
 *         description: Reminder deleted successfully
 *       '404':
 *         description: Reminder not found
 *       '500':
 *         description: Server error
 */
calenderReminderRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const result = await calendarCollection.deleteOne({
      _id: new ObjectId(id),
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
 *   get:
 *     summary: Get all reminders for a specific user
 *     description: Retrieves all reminders for a specific user by `userId`.
 *     operationId: getRemindersForUser
 *     tags:
 *       - Reminders
 *     parameters:
 *       - name: userId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to filter the reminders.
 *     responses:
 *       '200':
 *         description: List of reminders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       '404':
 *         description: No reminders found for this user
 *       '500':
 *         description: Server error
 */
calenderReminderRouter.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    const db = await connectDB();
    const calendarCollection = db.collection("calendar_reminders");

    const reminders = await calendarCollection
      .find({ userId: new ObjectId(userId) })
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
});

/**
 * @swagger
 * /auth/calender-reminder/due/today:
 *   get:
 *     summary: Get reminders due today
 *     description: Retrieves all reminders that are due today.
 *     operationId: getRemindersDueToday
 *     tags:
 *       - Reminders
 *     responses:
 *       '200':
 *         description: List of reminders due today
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *       '404':
 *         description: No reminders due today
 *       '500':
 *         description: Server error
 */
calenderReminderRouter.get("/due/today", async (req, res) => {
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
});

module.exports = calenderReminderRouter;
