const { connectDB } = require('./db');

async function schemas() {
    const db = await connectDB();

    const favoriteExists = await db
        .listCollections({ name: "favorite_links" })
        .toArray();

    if (favoriteExists.length === 0) {
        await db.createCollection("favorite_links", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["type", "title", "createdAt", "userId"],
                    properties: {
                        userId: { bsonType: "objectId" },

                        type: { enum: ["folder", "link"] },

                        title: {
                            bsonType: "string",
                            minLength: 1
                        },

                        parentId: {
                            bsonType: ["objectId", "null"]
                        },

                        url: {
                            bsonType: "string",
                            pattern: "^https?://"
                        },

                        createdAt: {
                            bsonType: "date"
                        }
                    },

                    oneOf: [
                        {
                            properties: { type: { enum: ["folder"] } },
                            not: { required: ["url"] }
                        },
                        {
                            properties: { type: { enum: ["link"] } },
                            required: ["url"]
                        }
                    ]
                }
            }
        });

        await db.collection("favorite_links").createIndex(
            { userId: 1, parentId: 1, title: 1 },
            { unique: true }
        );

        console.log("✅ favorite_links schema + index created");
    }

    const quotesExists = await db
        .listCollections({ name: "motivation_quotes" })
        .toArray();

    if (quotesExists.length === 0) {
        await db.createCollection("motivation_quotes", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["text", "createdAt"],
                    properties: {
                        text: {
                            bsonType: "string",
                            minLength: 5
                        },

                        author: {
                            bsonType: ["string", "null"]
                        },

                        tags: {
                            bsonType: "array",
                            items: { bsonType: "string" }
                        },

                        userId: {
                            bsonType: ["objectId", "null"]
                        },

                        createdAt: {
                            bsonType: "date"
                        }
                    }
                }
            }
        });

        await db.collection("motivation_quotes").createIndex(
            { userId: 1, text: 1 },
            { unique: true }
        );

        console.log("✅ motivation_quotes schema + index created");
    }
}

module.exports = { schemas };
