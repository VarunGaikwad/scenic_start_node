module.exports = {
  name: "shayari_quotes",

  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["text", "normalizedText", "type", "createdAt"],
      additionalProperties: false,

      properties: {
        text: {
          bsonType: "string",
          minLength: 5,
          description: "Original shayari or quote text",
        },

        normalizedText: {
          bsonType: "string",
          minLength: 5,
          description: "Lowercased + trimmed + space-normalized text for uniqueness",
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
      keys: { normalizedText: 1 },
      options: { unique: true },
    },
  ],
};
