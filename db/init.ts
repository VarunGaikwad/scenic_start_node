import { connectDB } from "./connect";
import usersSchema from "./schemas/users.schema";
import bookmarksSchema from "./schemas/bookmarks.schema";
import shayariAndQuotesSchema from "./schemas/shayariAndQuotes.schema";
import backgroundImagesSchema from "./schemas/backgroundImages.schema";
import calenderReminderSchema from "./schemas/calenderReminder.schema";

interface MongoSchema {
  name: string;
  validator: any;
  indexes?: any[];
}

const schemas: MongoSchema[] = [
  usersSchema as MongoSchema,
  bookmarksSchema as MongoSchema,
  shayariAndQuotesSchema as MongoSchema,
  backgroundImagesSchema as MongoSchema,
  calenderReminderSchema as MongoSchema,
];

export async function initDB(): Promise<void> {
  const db = await connectDB();

  for (const schema of schemas) {
    const exists = await db.listCollections({ name: schema.name }).toArray();

    if (exists.length > 0) continue;

    await db.createCollection(schema.name, {
      validator: schema.validator,
    });

    if (schema.indexes) {
      for (const index of schema.indexes) {
        const keys = index.keys || index.key || index;
        const options =
          index.options ||
          (index.name ? { name: index.name, unique: index.unique } : {});

        await db.collection(schema.name).createIndex(keys, options);
      }
    }

    console.log(`✅ ${schema.name} schema + indexes created`);
  }
}
