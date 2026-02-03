const { connectDB } = require("../../db");
const { ObjectId } = require("mongodb");

const birthdayRemindersRouter = require("express").Router();

/**
 * @swagger
 * /auth/birthday-reminders:
 *   post:
 *     summary: Create a birthday reminder
 *     tags:
 *       - Birthday Reminders
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - birthDate
 *             properties:
 *               name:
 *                 type: string
 *                 example: John Doe
 *               birthDate:
 *                 type: string
 *                 format: date
 *                 example: 1995-02-28
 *               note:
 *                 type: string
 *                 example: College friend
 *               remindBeforeDays:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 30
 *                 example: 1
 *               isActive:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Birthday reminder created
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       409:
 *         description: Duplicate reminder
 */

birthdayRemindersRouter.post("/", async (req, res) => {
  const {
    name,
    birthDate,
    note,
    remindBeforeDays = 0,
    isActive = true,
  } = req.body;

  if (!name || !birthDate) {
    return res.status(400).json({
      message: "name and birthDate are required",
    });
  }

  const parsedDate = new Date(birthDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return res.status(400).json({ message: "Invalid birthDate" });
  }

  if (
    !Number.isInteger(remindBeforeDays) ||
    remindBeforeDays < 0 ||
    remindBeforeDays > 30
  ) {
    return res.status(400).json({
      message: "remindBeforeDays must be an integer between 0 and 30",
    });
  }

  try {
    const db = await connectDB();

    const birthMonth = parsedDate.getUTCMonth() + 1;
    const birthDay = parsedDate.getUTCDate();

    const doc = {
      userId: new ObjectId(req.user.id),
      name: name.trim(),
      birthDate: parsedDate,
      birthMonth,
      birthDay,
      note: note?.trim() || null,
      remindBeforeDays,
      isActive: Boolean(isActive),
      createdAt: new Date(),
      lastNotifiedAt: null,
    };

    const result = await db.collection("birthday_reminders").insertOne(doc);

    res.status(201).json({
      message: "Birthday reminder created",
      reminder: {
        _id: result.insertedId,
        ...doc,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Birthday reminder already exists",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});


/**
 * @swagger
 * /auth/birthday-reminders/{id}:
 *   patch:
 *     summary: Update a birthday reminder
 *     tags:
 *       - Birthday Reminders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               note:
 *                 type: string
 *               remindBeforeDays:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 30
 *               isActive:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Birthday reminder updated
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reminder not found
 */

birthdayRemindersRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { name, birthDate, note, remindBeforeDays, isActive } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const db = await connectDB();

    const existing = await db.collection("birthday_reminders").findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.id),
    });

    if (!existing) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    const update = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ message: "name cannot be empty" });
      }
      update.name = name.trim();
    }

    if (birthDate !== undefined) {
      const parsedDate = new Date(birthDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: "Invalid birthDate" });
      }

      update.birthDate = parsedDate;
      update.birthMonth = parsedDate.getUTCMonth() + 1;
      update.birthDay = parsedDate.getUTCDate();
    }

    if (note !== undefined) {
      update.note = note ? note.trim() : null;
    }

    if (remindBeforeDays !== undefined) {
      if (
        !Number.isInteger(remindBeforeDays) ||
        remindBeforeDays < 0 ||
        remindBeforeDays > 30
      ) {
        return res.status(400).json({
          message: "remindBeforeDays must be between 0 and 30",
        });
      }
      update.remindBeforeDays = remindBeforeDays;
    }

    if (isActive !== undefined) {
      update.isActive = Boolean(isActive);
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    await db
      .collection("birthday_reminders")
      .updateOne({ _id: existing._id }, { $set: update });

    res.status(200).json({ message: "Birthday reminder updated" });
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Duplicate birthday reminder",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /auth/birthday-reminders:
 *   get:
 *     summary: Get all birthday reminders
 *     tags:
 *       - Birthday Reminders
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of birthday reminders
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   _id:
 *                     type: string
 *                   name:
 *                     type: string
 *                   birthDate:
 *                     type: string
 *                     format: date
 *                   birthMonth:
 *                     type: integer
 *                   birthDay:
 *                     type: integer
 *                   note:
 *                     type: string
 *                   remindBeforeDays:
 *                     type: integer
 *                   isActive:
 *                     type: boolean
 *       401:
 *         description: Unauthorized
 */

birthdayRemindersRouter.get("/", async (req, res) => {
  try {
    const db = await connectDB();

    const reminders = await db
      .collection("birthday_reminders")
      .find({ userId: new ObjectId(req.user.id) })
      .sort({ birthDate: 1 })
      .toArray();

    res.status(200).json(reminders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * @swagger
 * /auth/birthday-reminders/{id}:
 *   delete:
 *     summary: Delete a birthday reminder
 *     tags:
 *       - Birthday Reminders
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Birthday reminder deleted
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Reminder not found
 */

birthdayRemindersRouter.delete("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const db = await connectDB();

    const result = await db.collection("birthday_reminders").deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.id),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Reminder not found" });
    }

    res.status(200).json({ message: "Birthday reminder deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = birthdayRemindersRouter;
