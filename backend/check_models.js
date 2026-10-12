const { GoogleGenerativeAI } = require("@google/generative-ai");
const dotenv = require('dotenv');
dotenv.config();

async function listModels() {
    try {
        if (!process.env.GEMINI_API_KEY) {
            console.log("No GEMINI_API_KEY found in .env");
            return;
        }
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // For 0.2.0+, it might not have listModels directly on genAI, usually it's on a manager or via rest.
        // Actually the SDK has distinct ways. Let me check basic instantiation. 
        // NOTE: The Node SDK doesn't always expose listModels simply on the client instance in all versions, 
        // but let's try assuming the standard usage or a request to the endpoint if needed.
        // Actually, looking at docs, it is not always exposed in high level SDK.

        // Let's just try to instantiate a few and see which doesn't crash? 
        // No, that requires a request.

        console.log("Checking model 'gemini-1.5-flash'...");
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        // We can't really 'test' it without generating content.

        console.log("Attempting generation with 'gemini-1.5-flash'...");
        const result = await model.generateContent("Hello");
        console.log("Success with gemini-1.5-flash!", await result.response.text());

    } catch (error) {
        console.error("Error with gemini-1.5-flash:", error.message);
        try {
            console.log("Attempting generation with 'gemini-1.5-flash-latest'...");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
            const result = await model.generateContent("Hello");
            console.log("Success with gemini-1.5-flash-latest!", await result.response.text());
        } catch (err2) {
            console.error("Error with gemini-1.5-flash-latest:", err2.message);
        }

        try {
            console.log("Attempting generation with 'gemini-pro'...");
            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            const result = await model.generateContent("Hello");
            console.log("Success with gemini-pro!", await result.response.text());
        } catch (err3) {
            console.error("Error with gemini-pro:", err3.message);
        }
    }
}

listModels();
