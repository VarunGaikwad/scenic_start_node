const express = require("express");
const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");

const translationRouter = express.Router();
const genAI = new GoogleGenAI({});

const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3-flash-preview";
const CACHE_TTL = 24 * 60 * 60 * 1000;
const MAX_TEXT_LENGTH = 5000;
const REQUEST_TIMEOUT = 15000;

const LANGUAGES = {
  en: { label: "English" },
  es: { label: "Spanish" },
  fr: { label: "French" },
  de: { label: "German" },
  ja: { label: "Japanese" },
  zh: { label: "Chinese" },
  ar: { label: "Arabic" },
  pt: { label: "Portuguese" },
  ru: { label: "Russian" },
  ko: { label: "Korean" },
  it: { label: "Italian" },
  nl: { label: "Dutch" },
  hi: { label: "Hindi" },
  hinglish: {
    label: "Hindi",
    extraInstruction:
      "Write the translation in Latin script (Hinglish). Do NOT use Devanagari. Use natural conversational Hinglish with common English mixing.",
  },
};

const translationCache = new Map();

function getCacheKey(text, sl, tl) {
  const hash = crypto.createHash("sha256").update(text).digest("hex");
  return `${sl}:${tl}:${hash}`;
}

setInterval(
  () => {
    const now = Date.now();
    for (const [key, value] of translationCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) translationCache.delete(key);
    }
  },
  60 * 60 * 1000,
);

translationRouter.get("/", async (req, res) => {
  try {
    const { sl, tl, text } = req.query;

    if (!sl || !tl || !text) {
      return res
        .status(400)
        .json({ error: "'sl', 'tl', and 'text' query params are required" });
    }
    if (typeof text !== "string" || text.length > MAX_TEXT_LENGTH) {
      return res
        .status(400)
        .json({ error: `Text must be under ${MAX_TEXT_LENGTH} characters` });
    }

    const source = LANGUAGES[sl];
    const target = LANGUAGES[tl];

    if (!source || !target) {
      return res.status(400).json({ error: "Unsupported language" });
    }
    if (sl === tl) {
      return res.json({ translation: text });
    }

    const cacheKey = getCacheKey(text, sl, tl);
    const cached = translationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ translation: cached.translation, cached: true });
    }

    const translationPromise = genAI.models.generateContent({
      model: MODEL_NAME,
      systemInstruction:
        "You are a professional translation engine. Return ONLY the translated text. Do NOT explain or add quotes.",
      contents: `Translate from ${source.label} to ${target.label}: "${text}" ${target.extraInstruction || ""}`,
    });

    const result = await Promise.race([
      translationPromise,
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Translation timeout")),
          REQUEST_TIMEOUT,
        ),
      ),
    ]);

    const translatedText = result.text.trim();
    translationCache.set(cacheKey, {
      translation: translatedText,
      timestamp: Date.now(),
    });

    return res.json({ translation: translatedText });
  } catch (err) {
    if (err.status === 429 || err.message?.includes("429")) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "AI is currently busy. Try again shortly.",
        retryAfter: 30,
      });
    }
    if (err.message === "Translation timeout") {
      return res.status(504).json({ error: "Translation timed out" });
    }
    console.error("Translation Error:", err);
    return res
      .status(500)
      .json({ error: "Translation failed (internal error)" });
  }
});

module.exports = translationRouter;
