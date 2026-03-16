"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const calendarReminderSchema = {
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
                    description: "can only be one of the values: 'task', 'event', or 'birthday'",
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
                date: {
                    bsonType: "string",
                    description: "optional ISO date string (e.g. '2026-03-16') for the event/task/birthday",
                },
                time: {
                    bsonType: "string",
                    description: "optional time string in HH:mm format (e.g. '10:04')",
                },
                description: {
                    bsonType: "string",
                    description: "optional additional information about the reminder",
                },
                priority: {
                    enum: ["low", "medium", "high"],
                    description: "optional priority level of the task or event",
                },
                location: {
                    bsonType: "string",
                    description: "optional location for an event or birthday",
                },
                updatedAt: {
                    bsonType: "date",
                    description: "optional last updated timestamp",
                },
            },
        },
    },
    indexes: [{ userId: 1 }, { createdAt: 1 }, { date: 1 }],
};
exports.default = calendarReminderSchema;
