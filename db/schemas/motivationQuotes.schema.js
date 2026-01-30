module.exports = {
  name: "motivation_quotes",

  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["text", "createdAt"],
      properties: {
        text: {
          bsonType: "string",
          minLength: 5,
        },

        author: {
          bsonType: ["string", "null"],
        },

        tags: {
          bsonType: "array",
          items: { bsonType: "string" },
        },

        userId: {
          bsonType: ["objectId", "null"],
        },

        createdAt: {
          bsonType: "date",
        },
      },
    },
  },

  indexes: [
    {
      keys: { userId: 1, text: 1 },
      options: { unique: true },
    },
  ],
};
