const { connectDB } = require("../../db");
const { ObjectId } = require("mongodb");

const birthdayRemindersRouter = require("express").Router();

/**
 * ------------------------------------
 * POST create birthday reminder
 * ------------------------------------
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
    remindBeforeDays < 0 ||
    remindBeforeDays > 30 ||
    !Number.isInteger(remindBeforeDays)
  ) {
    return res.status(400).json({
      message: "remindBeforeDays must be an integer between 0 and 30",
    });
  }

  try {
    const db = await connectDB();

    const doc = {
      userId: new ObjectId(req.user.sub),
      name: name.trim(),
      birthDate: parsedDate,
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
 * ------------------------------------
 * PATCH update birthday reminder
 * ------------------------------------
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
      userId: new ObjectId(req.user.sub),
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
 * ------------------------------------
 * GET all birthday reminders
 * ------------------------------------
 */
birthdayRemindersRouter.get("/", async (req, res) => {
  try {
    const db = await connectDB();

    const reminders = await db
      .collection("birthday_reminders")
      .find({ userId: new ObjectId(req.user.sub) })
      .sort({ birthDate: 1 })
      .toArray();

    res.status(200).json(reminders);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ------------------------------------
 * DELETE birthday reminder
 * ------------------------------------
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
      userId: new ObjectId(req.user.sub),
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
