const express = require("express");
const musicTrackerRouter = express.Router();

const STALE_TIMEOUT = 5000;

const DB = {
  current: null,
  songs: {},
  listeningStats: {},
};

musicTrackerRouter.get("/", (_req, res) => {
  if (!DB.current) {
    return res.status(404).json({ message: "No song playing" });
  }

  const now = Date.now();

  if (now - DB.current.updatedAt > STALE_TIMEOUT) {
    DB.current = null;
    return res.status(404).json({ message: "No song playing" });
  }

  return res.status(200).json(DB.current);
});

musicTrackerRouter.post("/", (req, res) => {
  const { name, artist, imageUrl = "" } = req.body;

  if (typeof name !== "string" || typeof artist !== "string") {
    return res.status(400).json({ error: "Invalid input" });
  }

  const normalizedName = name.trim();
  const normalizedArtist = artist.trim();
  const songId = `${normalizedName.toLowerCase()}-${normalizedArtist.toLowerCase()}`;

  const song = {
    id: songId,
    name: normalizedName,
    artist: normalizedArtist,
    imageUrl,
    updatedAt: Date.now(),
  };

  DB.current = song;

  // Optional: track total listening time (1 sec per call)
  DB.listeningStats[songId] = (DB.listeningStats[songId] || 0) + 1;

  return res.status(200).json({ message: "Updated" });
});

musicTrackerRouter.get("/favorites", (req, res) => {
  const topFive = Object.entries(DB.listeningStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const result = topFive.map(([id, seconds]) => ({
    ...DB.songs[id],
    totalListeningSeconds: seconds,
  }));

  return res.status(200).json(result);
});

module.exports = musicTrackerRouter;
