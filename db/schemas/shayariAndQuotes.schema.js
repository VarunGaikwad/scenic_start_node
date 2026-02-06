module.exports = {
  name: "shayari_quotes",

  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["text", "type", "createdAt"],
      additionalProperties: false,

      properties: {
        text: {
          bsonType: "string",
          minLength: 5,
          description: "Shayari or quote text",
        },

        type: {
          bsonType: "string",
          enum: ["shayari", "quotes"],
          description: "Content type",
        },

        author: {
          oneOf: [
            { bsonType: "string", minLength: 1 },
            { bsonType: "null" },
          ],
          description: "Optional author name",
        },

        tags: {
          bsonType: "array",
          uniqueItems: true,
          items: {
            bsonType: "string",
            minLength: 1,
          },
          description: "Optional tags",
        },

        userId: {
          oneOf: [
            { bsonType: "objectId" },
            { bsonType: "null" },
          ],
          description: "Null for admin/system entries",
        },

        createdAt: {
          bsonType: "date",
          description: "Creation timestamp",
        },
      },
    },
  },

  validationLevel: "strict",
  validationAction: "error",

  indexes: [
    {
      keys: { type: 1, text: 1 },
      options: { unique: true },
    },
    {
      keys: { userId: 1, text: 1 },
      options: {
        unique: true,
        partialFilterExpression: { userId: { $ne: null } },
      },
    },
  ],
};
