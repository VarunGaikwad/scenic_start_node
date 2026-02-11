const { connectDB } = require("./connect");

const schemas = [
  require("./schemas/users.schema"),
  require("./schemas/bookmarks.schema"),
  require("./schemas/shayariAndQuotes.schema"),
  require("./schemas/backgroundImages.schema"),
  require("./schemas/calenderReminder.schema"),
];

async function initDB() {
  const db = await connectDB();

  for (const schema of schemas) {
    const exists = await db.listCollections({ name: schema.name }).toArray();

    if (exists.length > 0) continue;

    await db.createCollection(schema.name, {
      validator: schema.validator,
    });

    if (schema.indexes) {
      for (const index of schema.indexes) {
        await db.collection(schema.name).createIndex(index.keys, index.options);
      }
    }

    console.log(`✅ ${schema.name} schema + indexes created`);
  }
}

module.exports = { initDB };
