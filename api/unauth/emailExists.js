const { connectDB } = require("../../db");
const emailExistsRouter = require("express").Router();

emailExistsRouter.post("/", async (req, res) => {
    const { email } = req.body;

    // Do NOT reveal format errors differently
    if (typeof email !== "string") {
        return res.status(200).json({ exists: false });
    }

    const normalizedEmail = email.toLowerCase().trim();

    try {
        const db = await connectDB();

        const user = await db
            .collection("users")
            .findOne(
                { email: normalizedEmail },
                { projection: { _id: 1 } }, // minimal read
            );

        return res.status(200).json({
            exists: Boolean(user),
        });
    } catch (err) {
        console.error(err);

        // Still return same shape — avoid side-channel info
        return res.status(200).json({ exists: false });
    }
});

module.exports = emailExistsRouter;
