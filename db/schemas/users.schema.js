module.exports = {
  name: "users",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["email", "passwordHash", "createdAt", "status"],
      properties: {
        email: {
          bsonType: "string",
          pattern: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
        },

        passwordHash: {
          bsonType: "string",
          minLength: 60,
        },

        name: {
          bsonType: ["string", "null"],
          minLength: 1,
        },

        status: {
          enum: ["active", "pending", "blocked"],
        },

        emailVerified: {
          bsonType: "bool",
        },

        lastLoginAt: {
          bsonType: ["date", "null"],
        },

        createdAt: {
          bsonType: "date",
        },

        updatedAt: {
          bsonType: ["date", "null"],
        },
        passwordReset: {
          bsonType: ["object", "null"],
          properties: {
            tokenHash: { bsonType: "string" },
            expiresAt: { bsonType: "date" },
          },
        },
      },
    },
  },
  indexes: [
    {
      keys: { email: 1 },
      options: { unique: true },
    },
  ],
};
