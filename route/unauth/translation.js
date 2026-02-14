const express = require("express");
const translationRouter = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Simple in-memory cache
const translationCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCacheKey(text, tl) {
  return `${tl}:${text}`;
}

translationRouter.get("/", async (req, res) => {
  try {
    const { tl, text } = req.query;
    
    if (!text || !tl) {
      return res.status(400).json({
        error: "Both 'text' and 'tl' (target language) query params are required",
      });
    }

    // Check cache first
    const cacheKey = getCacheKey(text, tl);
    const cached = translationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json({ 
        translation: cached.translation,
        cached: true 
      });
    }

    // If not cached, call API
    const model = genAI.getGenerativeModel({
      model: "gemini-robotics-er-1.5-preview",
    });
    
    const prompt = `Translate the following text to ${tl}. Only return the translated text.\n\n${text}`;
    const result = await model.generateContent(prompt);
    const translatedText = result.response.text().trim();

    // Store in cache
    translationCache.set(cacheKey, {
      translation: translatedText,
      timestamp: Date.now()
    });

    return res.json({ translation: translatedText });
    
  } catch (err) {
    if (err.status === 429 || err.message?.includes("429")) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message: "The AI is currently busy. Please try again in about 35 seconds.",
        retryAfter: 35,
      });
    }
    console.error("Translation Error Details:", err);
    return res.status(500).json({ error: "Translation failed internal error" });
  }
});

module.exports = translationRouter;