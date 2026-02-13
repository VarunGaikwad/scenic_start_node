const express = require("express");
const translationRouter = express.Router();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

translationRouter.get("/", async (req, res) => {
  try {
    const { tl, text } = req.query;

    if (!text || !tl) {
      return res.status(400).json({
        error:
          "Both 'text' and 'tl' (target language) query params are required",
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-robotics-er-1.5-preview",
    });
    const prompt = `Translate the following text to ${tl}. Only return the translated text.\n\n${text}`;

    // Streamlined: generateContent returns a result object containing the response
    const result = await model.generateContent(prompt);
    const translatedText = result.response.text();

    return res.json({ translation: translatedText.trim() });
  } catch (err) {
    // Specifically catch the "Too Many Requests" error
    if (err.status === 429 || err.message?.includes("429")) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message:
          "The AI is currently busy. Please try again in about 35 seconds.",
        retryAfter: 35,
      });
    }

    console.error("Translation Error Details:", err);
    return res.status(500).json({ error: "Translation failed internal error" });
  }
});

module.exports = translationRouter;
