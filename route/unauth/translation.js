const express = require("express");
const translationRouter = express.Router();
const { GoogleGenAI } = require("@google/genai");

const GEMINI = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

translationRouter.get("/translate", async (req, res) => {
  try {
    const { text, target } = req.query;

    if (!text || !target) {
      return res.status(400).json({
        error: "text and target query params are required",
      });
    }

    const prompt = `Translate the following text to ${target}. Only return the translated text.\n\n${text}`;

    const response = await GEMINI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const translated = response.text;

    res.json({ translation: translated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Translation failed" });
  }
});

module.exports = translationRouter;
