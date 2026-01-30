const { default: axios } = require("axios");
const { connectDB } = require("../../db");
const { ObjectId } = require("mongodb");

const favoriteLinksRouter = require("express").Router();

/**
 * ------------------------------------
 * GET favicon (utility endpoint)
 * ------------------------------------
 */
favoriteLinksRouter.get("/", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ message: "url is required" });
  }

  try {
    const { data } = await axios.get(
      `https://ico.faviconkit.net/favicon/${url}?sz=128`,
      { proxy: false },
    );
    res.status(200).send(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch favicon" });
  }
});

/**
 * ------------------------------------
 * POST create folder / link
 * ------------------------------------
 */
favoriteLinksRouter.post("/", async (req, res) => {
  const { type, title, parentId, url } = req.body;

  if (!type || !title) {
    return res.status(400).json({
      message: "type and title are required",
    });
  }

  if (!["folder", "link"].includes(type)) {
    return res.status(400).json({ message: "Invalid type" });
  }

  if (type === "link" && !url) {
    return res.status(400).json({
      message: "url is required for link type",
    });
  }

  try {
    const db = await connectDB();

    // ✅ validate parentId (only folders allowed)
    let parentObjectId = null;

    if (parentId) {
      if (!ObjectId.isValid(parentId)) {
        return res.status(400).json({ message: "Invalid parentId" });
      }

      const parent = await db.collection("favorite_links").findOne({
        _id: new ObjectId(parentId),
        userId: new ObjectId(req.user.sub),
        type: "folder",
      });

      if (!parent) {
        return res.status(400).json({
          message: "Parent must be a folder",
        });
      }

      parentObjectId = parent._id;
    }

    const doc = {
      userId: new ObjectId(req.user.sub),
      type,
      title: title.trim(),
      parentId: parentObjectId,
      createdAt: new Date(),
    };

    if (type === "link") {
      doc.url = url.trim();
    }

    const result = await db.collection("favorite_links").insertOne(doc);

    res.status(201).json({
      message: "Favorite added",
      favorite: {
        _id: result.insertedId,
        ...doc,
      },
    });
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Item with same title already exists",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ------------------------------------
 * PATCH update folder / link
 * ------------------------------------
 */
favoriteLinksRouter.patch("/:id", async (req, res) => {
  const { id } = req.params;
  const { title, parentId, url } = req.body;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ message: "Invalid id" });
  }

  try {
    const db = await connectDB();

    const existing = await db.collection("favorite_links").findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.sub),
    });

    if (!existing) {
      return res.status(404).json({ message: "Favorite not found" });
    }

    // ✅ validate parentId
    if (parentId !== undefined) {
      if (parentId === id) {
        return res.status(400).json({
          message: "Item cannot be its own parent",
        });
      }

      if (parentId !== null) {
        if (!ObjectId.isValid(parentId)) {
          return res.status(400).json({ message: "Invalid parentId" });
        }

        const parent = await db.collection("favorite_links").findOne({
          _id: new ObjectId(parentId),
          userId: new ObjectId(req.user.sub),
          type: "folder",
        });

        if (!parent) {
          return res.status(400).json({
            message: "Parent must be a folder",
          });
        }
      }
    }

    // ✅ enforce schema rules
    if (existing.type === "folder" && url !== undefined) {
      return res.status(400).json({
        message: "Folders cannot have url",
      });
    }

    if (existing.type === "link" && url === null) {
      return res.status(400).json({
        message: "Link must have url",
      });
    }

    const update = {};

    if (title !== undefined) update.title = title.trim();
    if (parentId !== undefined) {
      update.parentId = parentId ? new ObjectId(parentId) : null;
    }
    if (existing.type === "link" && url !== undefined) {
      update.url = url.trim();
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    await db
      .collection("favorite_links")
      .updateOne({ _id: existing._id }, { $set: update });

    res.status(200).json({ message: "Favorite updated" });
  } catch (err) {
    console.error(err);

    if (err.code === 11000) {
      return res.status(409).json({
        message: "Item with same title already exists",
      });
    }

    res.status(500).json({ message: "Internal server error" });
  }
});

/**
 * ------------------------------------
 * GET all favorites as tree
 * ------------------------------------
 */
favoriteLinksRouter.get("/all", async (req, res) => {
  try {
    const db = await connectDB();

    const favorites = await db
      .collection("favorite_links")
      .find({ userId: new ObjectId(req.user.sub) })
      .sort({ type: 1, title: 1 })
      .toArray();

    const map = {};
    const roots = [];

    // init map
    for (const item of favorites) {
      if (item.type === "folder") {
        item.children = [];
      }
      map[item._id.toString()] = item;
    }

    // build tree
    for (const item of favorites) {
      if (item.parentId) {
        const parent = map[item.parentId.toString()];
        if (parent && parent.type === "folder") {
          parent.children.push(item);
        } else {
          roots.push(item);
        }
      } else {
        roots.push(item);
      }
    }

    res.status(200).json(roots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = favoriteLinksRouter;
