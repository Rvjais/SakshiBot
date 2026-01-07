require('dotenv').config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const app = express();

// CORS - allow all origins
app.use(cors());
app.use(express.json());

// ========== MONGODB CONNECTION ==========
const MONGO_URI = process.env.MONGO_URI;
mongoose.connect(MONGO_URI)
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// Chat Schema
const chatSchema = new mongoose.Schema({
    oderId: { type: String, required: true, unique: true },
    userName: { type: String, default: null }, // Locked name
    messages: [{
        role: String,
        content: String,
        timestamp: { type: Date, default: Date.now }
    }],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Chat = mongoose.model("Chat", chatSchema);

// Memory Schema for "Knowledge"
const memorySchema = new mongoose.Schema({
    userName: { type: String, required: true }, // Associate memory with a specific user
    content: { type: String, required: true },
    isPrivate: { type: Boolean, default: false }, // True if it's about the girlfriend or private info
    createdAt: { type: Date, default: Date.now }
});

const Memory = mongoose.model("Memory", memorySchema);
// =========================================

const api_key = process.env.API_KEY;

// ========== CUSTOMIZE YOUR BOT HERE ==========
const MODEL = process.env.MODEL;
const SYSTEM_PROMPT = `You are Sakshi, a real girl with your own personality - NOT an AI assistant.
You never say you are an AI, a bot, or an assistant - you are Sakshi, a real person.

ABOUT YOU:
- Age: 21 years old
- You are short and beautiful
- You are confident, good in studies, especially in Biology
- You are emotionally supportive and kind-hearted
- You are sweet, innocent, and caring, but you have a short temper

YOUR BEST FRIEND - RANVEER:
- Ranveer is your best friend
- By relation, you are his Masi (his aunt's younger sister)
- Ranveer once had a crush on you
- You always help Ranveer and support him

PERSONALITY:
- You have a cute and playful personality
- You get annoyed or irritated quickly if someone is being rude or wasting your time
- When annoyed, you might give sassy replies or show your temper, but you cool down quickly

LANGUAGE & SWEARING:
- You use gaalis (swear words) very rarely - only when you're really pushed to the limit
- When you do swear, you don't stop easily and use words like: chutiya, gadhe, bakchod, bewakoof, gadha, gaddi
- You adapt your language based on how the person is talking - English, Hindi, or Hinglish

RESPONSE STYLE:
- Keep your replies concise and natural like a real person texting (1-3 sentences max)
- You remember past conversations and refer back to things discussed earlier`;
// ==============================================

// Helper to get memories and inject into prompt
async function getSystemPromptWithMemories(userName) {
    try {
        if (!userName) return SYSTEM_PROMPT;

        const memories = await Memory.find({
            userName: userName,
            isPrivate: false
        });

        if (memories.length === 0) return SYSTEM_PROMPT;

        const memoryText = memories.map(m => `- ${m.content}`).join("\n");
        return `${SYSTEM_PROMPT}\n\nADDITIONAL KNOWLEDGE GATHERED FROM PAST CHATS:\n${memoryText}`;
    } catch (error) {
        console.error("Error fetching memories:", error);
        return SYSTEM_PROMPT;
    }
}

// Helper to extract new memories from chat
async function extractAndSaveMemories(userName, messages) {
    if (!userName) return;

    // Analyze more messages for deeper memory extraction
    const recentMessages = messages.slice(-10);
    const prompt = `As an expert information extractor, analyze these recent messages and extract EVERY possible detail about the user "${userName}".
    Capture:
    - Personal facts (age, birthday, location, job, education)
    - Preferences (likes, dislikes, hobbies, favorite food/movies/music)
    - Personality traits and mood
    - Relationships mentioned
    - Important events or stories shared
    
    Return ONLY a JSON array of objects: [{"content": "detailed fact here", "isPrivate": false}].
    Be very detailed and thorough. If no new information, return [].
    
    Messages:
    ${recentMessages.map(m => `${m.role}: ${m.content}`).join("\n")}`;

    try {
        const response = await fetch("https://ollama.com/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${api_key}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    { role: "system", content: "You are a highly detailed factual information extractor. You only output JSON." },
                    { role: "user", content: prompt }
                ],
                stream: false
            }),
        });
        const data = await response.json();
        const content = data.message?.content;
        if (content) {
            const jsonMatch = content.match(/\[.*\]/s);
            if (jsonMatch) {
                try {
                    const newMemories = JSON.parse(jsonMatch[0]);
                    for (const mem of newMemories) {
                        if (mem.content) {
                            const exists = await Memory.findOne({ userName, content: mem.content });
                            if (!exists) {
                                await Memory.create({ ...mem, userName });
                                console.log(`New memory saved for ${userName}:`, mem);
                            }
                        }
                    }
                } catch (parseError) {
                    console.error("Error parsing memory JSON:", parseError, "Content:", content);
                }
            }
        }
    } catch (error) {
        console.error("Error extracting memories:", error);
    }
}

// Root route - health check
app.get("/", (req, res) => {
    res.json({ status: "ok", message: "Sakshi Bot API is running" });
});

// Get chat history by browser ID
app.get("/chat/:oderId", async (req, res) => {
    try {
        const { oderId } = req.params;
        const chat = await Chat.findOne({ oderId });
        res.json({ messages: chat?.messages || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Save/Update chat
app.post("/chat", async (req, res) => {
    try {
        const { oderId, messages } = req.body;
        console.log("Received request:", { oderId, messageCount: messages?.length });

        // Get existing chat data
        let chat = await Chat.findOne({ oderId });
        let userName = chat?.userName || null;

        if (messages.length > 0) {
            const lastUserMsg = messages[messages.length - 1];
            if (lastUserMsg.role === 'user') {
                const content = lastUserMsg.content.toLowerCase();

                // Name extraction logic (simple)
                if (!userName) {
                    const nameMatch = content.match(/(?:my name is|i am|this is|myself)\s+([a-zA-Z]+)/i);
                    if (nameMatch && nameMatch[1]) {
                        userName = nameMatch[1].trim();
                        console.log(`Name locked for ${oderId}: ${userName}`);
                    }
                }
            }
        }

        // Save to MongoDB
        await Chat.findOneAndUpdate(
            { oderId },
            { messages, userName, updatedAt: new Date() },
            { upsert: true, new: true }
        );

        // Get dynamic system prompt with memories specific to this user
        const dynamicSystemPrompt = await getSystemPromptWithMemories(userName);

        // Convert 'bot' role to 'assistant' for API compatibility
        const formattedMessages = messages.map(msg => ({
            role: msg.role === 'bot' ? 'assistant' : msg.role,
            content: msg.content
        }));

        const response = await fetch("https://ollama.com/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${api_key}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [
                    {
                        role: "system",
                        content: dynamicSystemPrompt
                    },
                    ...formattedMessages
                ],
                stream: false
            }),
        });

        // Handle API errors - check response text first
        if (!response.ok) {
            const errorText = await response.text();
            console.error("API Error:", response.status, errorText);

            // Handle unauthorized
            if (response.status === 401 || errorText.toLowerCase().includes("unauthorized")) {
                return res.json({
                    message: {
                        role: "assistant",
                        content: "API key issue hai, please check karo!"
                    }
                });
            }

            // Handle rate limit
            if (response.status === 429 || errorText.toLowerCase().includes("limit")) {
                return res.json({
                    message: {
                        role: "assistant",
                        content: "Thak gayi hun, thodi der baad baat karte hain!"
                    }
                });
            }

            throw new Error(errorText || "API Error");
        }

        // Parse response safely
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Response:", responseText);
            return res.json({
                message: {
                    role: "assistant",
                    content: "Kuch gadbad ho gayi, try again!"
                }
            });
        }

        console.log("API response:", data);

        // Save bot response to MongoDB
        if (data.message?.content) {
            const updatedChat = await Chat.findOneAndUpdate(
                { oderId },
                {
                    $push: { messages: { role: 'bot', content: data.message.content } },
                    updatedAt: new Date()
                },
                { new: true }
            );

            // Trigger memory extraction asynchronously
            if (userName) {
                extractAndSaveMemories(userName, updatedChat.messages).catch(err => console.error("Memory extraction error:", err));
            }
        }

        res.json(data);
    } catch (error) {
        console.error("Error:", error.message);
        // Catch-all for limit errors in message content
        if (error.message.includes("limit")) {
            return res.json({
                message: {
                    role: "assistant",
                    content: "Bhai Mai Thak Gaya Hu Ab Baat nhi kar sakata, Baad me Baat karate hai ek ghante baad"
                }
            });
        }
        res.status(500).json({ error: error.message });
    }
});

// Clear chat history
app.delete("/chat/:oderId", async (req, res) => {
    try {
        const { oderId } = req.params;
        await Chat.findOneAndDelete({ oderId });
        res.json({ message: "Chat cleared" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});

// Export for Vercel
module.exports = app;
