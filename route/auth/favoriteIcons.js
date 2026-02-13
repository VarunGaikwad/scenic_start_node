const express = require("express");
const axios = require("axios");
const { parse } = require("tldts");
const cheerio = require("cheerio");
const supabase = require("../../supabase");

const favoriteIconRouter = express.Router();
const BUCKET_NAME = "favorite icon";

// Download a binary icon from a direct URL
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

// Scrape the website's HTML to find the best favicon/icon link using Cheerio
async function scrapeIconFromSite(domain) {
  const baseUrl = `https://${domain}`;
  try {
    const { data: html } = await axios.get(baseUrl, {
      timeout: 5000,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(html);
    const candidates = [];

    // Collect all <link> icon candidates
    $(
      'link[rel="icon"], link[rel="shortcut icon"], link[rel="apple-touch-icon"], link[rel="apple-touch-icon-precomposed"]',
    ).each((_, el) => {
      const href = $(el).attr("href");
      if (!href) return;

      const sizes = $(el).attr("sizes") || "";
      // Parse size (e.g. "128x128" → 128, "any" → 0)
      const sizeMatch = sizes.match(/(\d+)x(\d+)/);
      const size = sizeMatch ? parseInt(sizeMatch[1], 10) : 0;

      candidates.push({ href, size });
    });

    // Also check og:image as a last-resort icon source
    const ogImage = $('meta[property="og:image"]').attr("content");
    if (ogImage) {
      candidates.push({ href: ogImage, size: -1 }); // lowest priority
    }

    if (candidates.length === 0) return null;

    // Sort: largest explicit size first, then unsized (0), then og:image (-1)
    candidates.sort((a, b) => b.size - a.size);

    // Try each candidate until one downloads successfully
    for (const candidate of candidates) {
      // Resolve relative URLs
      let iconUrl = candidate.href;
      if (iconUrl.startsWith("//")) {
        iconUrl = `https:${iconUrl}`;
      } else if (iconUrl.startsWith("/")) {
        iconUrl = `${baseUrl}${iconUrl}`;
      } else if (!iconUrl.startsWith("http")) {
        iconUrl = `${baseUrl}/${iconUrl}`;
      }

      const result = await fetchFavicon(iconUrl);
      if (result) return result;
    }

    return null;
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
    // 1. Try to download from Supabase Storage (cache)
    const { data: existingFile, error: downloadError } = await supabase.storage
      .from(BUCKET_NAME)
      .download(fileName);

    if (existingFile) {
      const buffer = Buffer.from(await existingFile.arrayBuffer());
      res.set("Content-Type", "image/png");
      return res.send(buffer);
    }

    // 2. Build list of domains to try (include root domain as fallback)
    const tryDomains = [domain];
    const parsed = parse(domain);
    if (parsed?.domain && parsed.domain !== domain)
      tryDomains.push(parsed.domain);

    let bestFavicon = null;

    // 3. First attempt: Scrape icon directly from the website using Cheerio
    for (const d of tryDomains) {
      const scraped = await scrapeIconFromSite(d);
      if (scraped) {
        bestFavicon = scraped;
        break;
      }
    }

    // 4. Fallback: Google Favicon API (only if Cheerio scraping failed)
    if (!bestFavicon) {
      for (const d of tryDomains) {
        const googleUrl = `https://www.google.com/s2/favicons?domain=${d}&sz=128`;
        const fetched = await fetchFavicon(googleUrl);
        if (fetched) {
          bestFavicon = fetched;
          break;
        }
      }
    }

    if (bestFavicon) {
      // 5. Upload to Supabase Storage for future use
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
