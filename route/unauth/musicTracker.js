const express = require("express");
const musicTrackerRouter = express.Router();

const STALE_TIMEOUT = 6 * 60 * 60 * 1000; // 6 hour

const DB = {
  current: null,
  songs: {}, // Stores metadata for favorites
  listeningStats: {}, // Stores listening seconds
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

  const IS_PLAYING_TIMEOUT = 30 * 1000;

  if (DB.current.isPlaying && now - DB.current.updatedAt > IS_PLAYING_TIMEOUT) {
    DB.current.isPlaying = false;
  }

  return res.status(200).json(DB.current);
});

musicTrackerRouter.post("/", (req, res) => {
  const {
    name,
    artist,
    imageUrl = "",
    currentTime,
    totalTime,
    isPlaying,
    songUrl,
  } = req.body;

  // Validate types
  if (
    typeof name !== "string" ||
    typeof artist !== "string" ||
    typeof currentTime !== "number" ||
    typeof totalTime !== "number" ||
    typeof isPlaying !== "boolean"
  ) {
    return res.status(400).json({ error: "Invalid input types" });
  }

  const normalizedName = name.trim();
  const normalizedArtist = artist.trim();

  if (!normalizedName || !normalizedArtist) {
    return res.status(400).json({ error: "Name and artist required" });
  }

  // Validate time bounds
  if (currentTime < 0 || totalTime <= 0 || currentTime > totalTime) {
    return res.status(400).json({ error: "Invalid time values" });
  }

  const songId = `${normalizedName.toLowerCase()}-${normalizedArtist.toLowerCase()}`;

  // Store song metadata for favorites
  if (!DB.songs[songId]) {
    DB.songs[songId] = {
      id: songId,
      name: normalizedName,
      artist: normalizedArtist,
      imageUrl,
      songUrl,
    };
  }

  // Update current song
  const song = {
    id: songId,
    name: normalizedName,
    artist: normalizedArtist,
    imageUrl,
    currentTime,
    totalTime,
    isPlaying,
    updatedAt: Date.now(),
    songUrl,
  };

  DB.current = song;

  // Track listening time only if playing
  if (isPlaying) {
    DB.listeningStats[songId] = (DB.listeningStats[songId] || 0) + 1; // 1 sec per call
  }

  return res.status(200).json({ message: "Updated" });
});

// Favorites endpoint (top 5 by total listening seconds)
musicTrackerRouter.get("/favorites", (_req, res) => {
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
