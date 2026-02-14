const { connectDB } = require("./db");
const bcrypt = require("bcrypt");

async function createAdmin() {
    try {
        const db = await connectDB();
        const email = "admin@scenic.com";
        const password = "admin";

        const existing = await db.collection("users").findOne({ email });
        if (existing) {
            console.log("Admin user already exists");
            process.exit(0);
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await db.collection("users").insertOne({
            email,
            passwordHash,
            role: "admin",
            status: "active",
            emailVerified: true,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log(`Admin user created.\nEmail: ${email}\nPassword: ${password}`);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

createAdmin();
