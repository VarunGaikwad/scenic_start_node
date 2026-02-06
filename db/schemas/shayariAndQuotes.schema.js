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
        },

        type: {
          bsonType: "string",
          enum: ["shayari", "quotes"],
        },

        author: {
          bsonType: ["string", "null"],
          minLength: 1
        },

        tags: {
          bsonType: "array",
          minItems: 1,
          uniqueItems: true,
          items: {
            bsonType: "string",
            minLength: 1
          }
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

  validationLevel: "strict",
  validationAction: "error",

  indexes: [
    {
      keys: { userId: 1, text: 1 },
      options: {
        unique: true,
        partialFilterExpression: { userId: { $ne: null } }
      },
    },
  ],
};
