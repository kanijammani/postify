const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const suggestCaption = async (req, res) => {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return res.status(500).json({ message: "Gemini API Key not configured on server." });
        }

        if (!req.file) {
            return res.status(400).json({ message: "Please select an image first." });
        }

        // Use a model that supports vision
        // Trying gemini-1.5-flash-latest as fallback for version issues
        let modelName = "gemini-1.5-flash";
        // Note: You can switch this to 'gemini-1.5-pro' or 'gemini-1.5-flash-latest' if needed

        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const mimeType = req.file.mimetype;
        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType
            },
        };

        const prompt = "Write an engaging, creative Postify caption for this photo. Include emojis and 3-5 relevant hashtags. Keep it concise.";

        const result = await model.generateContent([prompt, imagePart]);
        const response = await result.response;
        const text = response.text();

        res.status(200).json({ caption: text.trim() });
    } catch (error) {
        console.error("AI Suggestion Error:", error);
        // Send the specific error message to the frontend so the failure reason is visible
        res.status(500).json({ message: error.message || "Failed to generate caption" });
    }
};

module.exports = { suggestCaption };
