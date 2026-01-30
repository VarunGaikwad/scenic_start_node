module.exports = {
  name: "birthday_reminders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["userId", "name", "birthDate", "createdAt"],
      properties: {
        userId: { bsonType: "objectId" },

        // Whose birthday is this
        name: { bsonType: "string", minLength: 1 },

        // Actual date of birth
        birthDate: { bsonType: "date" },

        // Optional note like "college friend", "manager", etc.
        note: { bsonType: ["string", "null"] },

        // Whether reminder is active
        isActive: { bsonType: "bool", default: true },

        // How many days before to notify (e.g. 0 = same day, 1 = day before)
        remindBeforeDays: {
          bsonType: "int",
          minimum: 0,
          maximum: 30,
          default: 0,
        },

        // When the reminder was created
        createdAt: { bsonType: "date" },

        // Optional: last time notification was sent
        lastNotifiedAt: { bsonType: ["date", "null"] },
      },
    },
  },

  indexes: [
    // Prevent duplicate birthday entries for same person per user
    {
      keys: { userId: 1, name: 1, birthDate: 1 },
      options: { unique: true },
    },

    // Fast lookup for upcoming reminders
    {
      keys: { userId: 1, birthDate: 1 },
    },
  ],
};
