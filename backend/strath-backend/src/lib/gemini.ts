import { GoogleGenerativeAI } from "@google/generative-ai";

// ============================================
// GEMINI AI CLIENT
// ============================================
// Centralized client for all Gemini API interactions:
// - Intent parsing (Flash)
// - Profile summarization (Flash Lite)
// - Embeddings (text-embedding-004)

if (!process.env.GEMINI_API_KEY) {
    console.warn("⚠️  GEMINI_API_KEY is not set. AI features will not work.");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// Models
export const flashModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
        temperature: 0.3, // Low temp for consistent structured output
        maxOutputTokens: 1024,
    },
});

export const flashLiteModel = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash-lite",
    generationConfig: {
        temperature: 0.5, // Slightly higher for natural summaries
        maxOutputTokens: 512,
    },
});

// Use gemini-embedding-001 (the actual model available on this API key)
const embeddingModelName = "models/gemini-embedding-001";

/**
 * Generate an embedding vector for the given text.
 * Returns a 3072-dimensional float array.
 * 
 * Cost: ~$0.006 per 1M tokens (extremely cheap)
 * Latency: ~100ms
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
    
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${embeddingModelName}:embedContent?key=${apiKey}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                model: embeddingModelName,
                content: { parts: [{ text }] },
            }),
        }
    );
    
    if (!response.ok) {
        const error = await response.text();
        console.error("[Embedding Error]", response.status, error);
        throw new Error(`Embedding API failed: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return data.embedding.values;
}

/**
 * Generate embeddings for multiple texts in a batch.
 * More efficient than calling generateEmbedding() in a loop.
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    // Process in parallel using the direct API
    const results = await Promise.all(texts.map(text => generateEmbedding(text)));
    return results;
}

/**
 * Generate structured JSON from a prompt using Gemini Flash.
 * Used for intent parsing.
 */
export async function generateStructuredJSON<T>(prompt: string): Promise<T> {
    const result = await flashModel.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
            responseMimeType: "application/json",
        },
    });
    
    const text = result.response.text();
    return JSON.parse(text) as T;
}

/**
 * Generate natural language text using Gemini Flash Lite.
 * Used for profile summaries and explanations.
 */
export async function generateText(prompt: string): Promise<string> {
    const result = await flashLiteModel.generateContent(prompt);
    return result.response.text().trim();
}

export default genAI;
