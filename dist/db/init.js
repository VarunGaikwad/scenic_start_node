"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDB = initDB;
const connect_1 = require("./connect");
const users_schema_1 = __importDefault(require("./schemas/users.schema"));
const bookmarks_schema_1 = __importDefault(require("./schemas/bookmarks.schema"));
const shayariAndQuotes_schema_1 = __importDefault(require("./schemas/shayariAndQuotes.schema"));
const backgroundImages_schema_1 = __importDefault(require("./schemas/backgroundImages.schema"));
const calenderReminder_schema_1 = __importDefault(require("./schemas/calenderReminder.schema"));
const schemas = [
    users_schema_1.default,
    bookmarks_schema_1.default,
    shayariAndQuotes_schema_1.default,
    backgroundImages_schema_1.default,
    calenderReminder_schema_1.default,
];
async function initDB() {
    const db = await (0, connect_1.connectDB)();
    for (const schema of schemas) {
        const exists = await db.listCollections({ name: schema.name }).toArray();
        if (exists.length > 0)
            continue;
        await db.createCollection(schema.name, {
            validator: schema.validator,
        });
        if (schema.indexes) {
            for (const index of schema.indexes) {
                const keys = index.keys || index.key || index;
                const options = index.options ||
                    (index.name ? { name: index.name, unique: index.unique } : {});
                await db.collection(schema.name).createIndex(keys, options);
            }
        }
        console.log(`✅ ${schema.name} schema + indexes created`);
    }
}
