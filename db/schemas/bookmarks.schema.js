module.exports = {
  name: "bookmarks",
  validator: {
    $jsonSchema: {
      bsonType: "object",
      required: ["type", "title", "createdAt", "userId"],
      properties: {
        userId: { bsonType: "objectId" },
        type: { enum: ["folder", "link"] },
        title: { bsonType: "string", minLength: 1 },
        parentId: { bsonType: ["objectId", "null"] },
        url: { bsonType: "string", pattern: "^https?://" },
        createdAt: { bsonType: "date" },
      },
      oneOf: [
        {
          properties: { type: { enum: ["folder"] } },
          not: { required: ["url"] },
        },
        { properties: { type: { enum: ["link"] } }, required: ["url"] },
      ],
    },
  },
  indexes: [
    {
      keys: { userId: 1, parentId: 1, title: 1 },
      options: { unique: true },
    },
  ],
};
