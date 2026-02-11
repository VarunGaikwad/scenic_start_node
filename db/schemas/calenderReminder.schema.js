module.exports = {
  name: "calendar_reminders",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["type", "title", "createdAt", "userId", "completed"],
      properties: {
        userId: {
          bsonType: "objectId",
          description: "must be an objectId and is required",
        },
        type: {
          enum: ["task", "event", "birthday"],
          description:
            "can only be one of the values: 'task', 'event', or 'birthday'",
        },
        title: {
          bsonType: "string",
          minLength: 1,
          description: "must be a non-empty string",
        },
        createdAt: {
          bsonType: "date",
          description: "must be a valid date and is required",
        },
        completed: {
          bsonType: "bool",
          description: "must be a boolean value",
        },
        description: {
          bsonType: "string",
          description:
            "optional field to store additional information about the reminder",
        },
        dueDate: {
          bsonType: "date",
          description:
            "optional field to store the due date for a task or event",
        },
        priority: {
          enum: ["low", "medium", "high"],
          description:
            "optional field to indicate the priority level of the task or event",
        },
        reminderTime: {
          bsonType: "date",
          description:
            "optional field to store the time for the reminder notification",
        },
        location: {
          bsonType: "string",
          description:
            "optional field to store the location for an event or birthday",
        },
        updatedAt: {
          bsonType: "date",
          description: "optional field to store the last updated time",
        },
      },
    },
  },
  indexes: [{ userId: 1 }, { createdAt: 1 }, { dueDate: 1 }],
};
