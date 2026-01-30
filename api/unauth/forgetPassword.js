const crypto = require("crypto");
const { connectDB } = require("../../db");

const forgotPasswordRouter = require("express").Router();

forgotPasswordRouter.post("/", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: "Email is required",
    });
  }

  try {
    const db = await connectDB();
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db
      .collection("users")
      .findOne({ email: normalizedEmail });

    // IMPORTANT: do NOT reveal whether user exists
    if (!user) {
      return res.status(200).json({
        message: "If the account exists, a reset link has been sent",
      });
    }

    // Generate raw token
    const rawToken = crypto.randomBytes(32).toString("hex");

    // Hash token before storing (CRITICAL)
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 minutes

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordReset: {
            tokenHash,
            expiresAt,
          },
        },
      },
    );

    // TODO: send email
    // reset link example:
    // https://your-frontend/reset-password?token=<rawToken>&email=<email>

    console.log("🔐 Password reset token (DEV ONLY):", rawToken);

    res.status(200).json({
      message: "If the account exists, a reset link has been sent",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Internal server error",
    });
  }
});

module.exports = forgotPasswordRouter;
