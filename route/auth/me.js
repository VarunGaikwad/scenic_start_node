const { ObjectId } = require("mongodb");
const { connectDB } = require("../../db");

const meRouter = require("express").Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           description: User's unique identifier
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         username:
 *           type: string
 *           description: User's username
 *         status:
 *           type: string
 *           enum: [active, inactive, suspended]
 *           description: Account status
 *         role:
 *           type: string
 *           enum: [user, admin]
 *           description: User role
 *         new_user:
 *           type: boolean
 *           description: Whether this is a new user
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 *       example:
 *         _id: 507f1f77bcf86cd799439011
 *         email: user@example.com
 *         username: johndoe
 *         status: active
 *         role: user
 *         new_user: false
 *         createdAt: 2024-01-15T10:30:00Z
 *         updatedAt: 2024-01-20T14:45:00Z
 */

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Get current authenticated user
 *     description: Retrieve the profile information of the currently authenticated user. Sensitive fields like passwordHash are excluded.
 *     tags:
 *       - User
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized or user not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             examples:
 *               unauthorized:
 *                 value:
 *                   message: Unauthorized
 *               invalidToken:
 *                 value:
 *                   message: Invalid token
 *               userNotFound:
 *                 value:
 *                   message: User not found
 *       403:
 *         description: Account not active
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: Account not active
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *             example:
 *               message: Internal server error
 */
meRouter.get("/", async (req, res) => {
  try {
    // Note: req.user should be set by authentication middleware
    // If your auth middleware doesn't guarantee req.user exists, keep this check
    if (!req.user || !req.user.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(req.user.id)) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const db = await connectDB();

    // Fetch user without sensitive fields
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(req.user.id) },
      {
        projection: {
          passwordHash: 0,
          passwordReset: 0,
          // Exclude any other sensitive fields
          // emailVerificationToken: 0,
          // resetPasswordToken: 0,
        },
      }
    );

    // User not found in database
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // Check account status
    if (user.status !== "active") {
      return res.status(403).json({ message: "Account not active" });
    }

    return res.status(200).json(user);
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = meRouter;