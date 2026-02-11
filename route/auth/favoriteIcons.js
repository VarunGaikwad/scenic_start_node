const express = require("express");
const axios = require("axios");
const { parse } = require("tldts");
const cheerio = require("cheerio");
const supabase = require("../../supabase");

const favoriteIconRouter = express.Router();
const BUCKET_NAME = "favorite icon";

async function fetchFavicon(url) {
  try {
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      timeout: 5000,
    });
    return {
      data: response.data,
      contentType: response.headers["content-type"] || "image/png",
    };
  } catch (err) {
    return null;
  }
}

favoriteIconRouter.get("/", async (req, res) => {
  const { domain } = req.query;
  if (!domain) return res.status(400).send("Missing domain");

  // Sanitize filename (e.g., "google.com.png")
  const fileName = `${domain.replace(/[^a-z0-9.]/gi, "_")}.png`;

  try {
    // 1. Try to download from Supabase Storage
    const { data: existingFile, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(fileName);

    if (existingFile) {
      const buffer = Buffer.from(await existingFile.arrayBuffer());
      res.set("Content-Type", "image/png");
      return res.send(buffer);
    }

    // 2. If not in Storage, fetch from external sources
    const tryDomains = [domain];
    const parsed = parse(domain);
    if (parsed?.domain && parsed.domain !== domain)
      tryDomains.push(parsed.domain);

    let bestFavicon = null;

    for (const d of tryDomains) {
      const googleUrl = `https://www.google.com/s2/favicons?domain=${d}&sz=128`;
      const fetched = await fetchFavicon(googleUrl);
      if (fetched) {
        bestFavicon = fetched;
        break;
      }
    }

    if (bestFavicon) {
      // 3. Upload to Supabase Storage for future use
      // We use 'upsert: true' to overwrite if needed
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, bestFavicon.data, {
          contentType: bestFavicon.contentType,
          upsert: true,
        });

      if (uploadError) console.error("Supabase Upload Error:", uploadError);

      res.set("Content-Type", bestFavicon.contentType);
      return res.send(bestFavicon.data);
    }

    return res.status(404).send("Favicon not found");
  } catch (err) {
    console.error("Route Error:", err);
    return res.status(500).send("Internal server error");
  }
});

module.exports = favoriteIconRouter;
