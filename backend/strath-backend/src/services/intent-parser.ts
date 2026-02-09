import { generateStructuredJSON, generateEmbedding } from "../lib/gemini";

// ============================================
// INTENT PARSER SERVICE
// ============================================
// Converts natural language queries into structured search parameters.
// This is the "brain" that understands what users are looking for.
//
// Example: "someone chill who loves music and doesn't party much"
// → { traits: ["chill", "music-lover"], lifestyle: { drinking: "rarely" }, vibe: "relaxed" }
//
// Cost: ~$0.00005 per query (Gemini Flash)
// Latency: ~300ms

/**
 * Structured output from intent parsing.
 * Used to build both SQL filters and semantic search queries.
 */
export interface ParsedIntent {
    // Natural language understanding
    vibe: "chill" | "adventurous" | "intellectual" | "social" | "creative" | "romantic" | "ambitious" | "any";
    
    // Hard filters (SQL WHERE clauses)
    filters: {
        gender?: string[];              // ["female", "male"]
        yearOfStudy?: number[];         // [2, 3, 4]
        course?: string;                // Partial match
        university?: string;            // Exact match
        ageRange?: { min: number; max: number };
        religion?: string;
        smoking?: string;               // "yes" | "no" | "sometimes"
        drinking?: string;              // "never" | "socially" | "regularly"
    };
    
    // Soft preferences (used for scoring, not filtering)
    preferences: {
        traits: string[];               // ["introverted", "creative", "fitness-oriented"]
        interests: string[];            // ["music", "coding", "hiking"]
        personality: string[];          // ["calm", "funny", "ambitious"]
        lookingFor?: string;            // "relationship" | "friends" | "casual"
        communicationStyle?: string;    // "deep_talks" | "memes" | "calls"
        loveLanguage?: string;          // "words" | "touch" | "time" | "gifts" | "acts"
    };

    // The semantic search query (optimized for embedding similarity)
    semanticQuery: string;

    // Confidence score (0-1) — how well we understood the query
    confidence: number;

    // Did we detect a follow-up / refinement?
    isRefinement: boolean;
    refinementAction?: "narrow" | "broaden" | "different" | "more_like";
}

/**
 * Parse a natural language query into structured search parameters.
 * 
 * @param query - The user's natural language input (e.g., "find me a gym bro who's funny")
 * @param previousIntent - Previous intent for follow-up handling
 * @param userPreferences - Learned preferences from wingman memory
 */
export async function parseIntent(
    query: string,
    previousIntent?: ParsedIntent | null,
    userPreferences?: Record<string, number>,
): Promise<ParsedIntent> {
    const contextHints = previousIntent 
        ? `\nPrevious search: The user previously searched for "${previousIntent.semanticQuery}" with vibe "${previousIntent.vibe}". If this new query seems like a follow-up (e.g., "but more outgoing" or "show me more like that"), set isRefinement=true and adjust accordingly.`
        : "";

    const preferenceHints = userPreferences && Object.keys(userPreferences).length > 0
        ? `\nLearned preferences: ${JSON.stringify(userPreferences)}`
        : "";

    const prompt = `You are an intent parser for a university dating app's AI matchmaker.
Parse the user's query into a structured JSON format for searching profiles.

RULES:
- Extract hard filters (gender, year, course) ONLY if explicitly mentioned
- Extract soft preferences (traits, interests, personality) from implied meaning
- Generate a semanticQuery that captures the essence of who they want to meet (2-3 sentences, written as a personality description of the ideal match)
- Rate your confidence from 0 to 1
- The vibe should capture the overall energy they're looking for
- If this looks like a refinement of a previous search, set isRefinement=true
- Don't hallucinate filters that weren't mentioned${contextHints}${preferenceHints}

User query: "${query}"

Respond with this exact JSON structure:
{
    "vibe": "chill" | "adventurous" | "intellectual" | "social" | "creative" | "romantic" | "ambitious" | "any",
    "filters": {
        "gender": ["string"] | null,
        "yearOfStudy": [number] | null,
        "course": "string" | null,
        "university": "string" | null,
        "ageRange": {"min": number, "max": number} | null,
        "religion": "string" | null,
        "smoking": "string" | null,
        "drinking": "string" | null
    },
    "preferences": {
        "traits": ["string"],
        "interests": ["string"],
        "personality": ["string"],
        "lookingFor": "string" | null,
        "communicationStyle": "string" | null,
        "loveLanguage": "string" | null
    },
    "semanticQuery": "string describing the ideal match as a person",
    "confidence": number,
    "isRefinement": boolean,
    "refinementAction": "narrow" | "broaden" | "different" | "more_like" | null
}`;

    try {
        const parsed = await generateStructuredJSON<ParsedIntent>(prompt);
        
        // Clean up null values from filters
        if (parsed.filters) {
            for (const [key, value] of Object.entries(parsed.filters)) {
                if (value === null || value === undefined) {
                    delete (parsed.filters as Record<string, unknown>)[key];
                }
            }
        }

        // Handle refinements by merging with previous intent
        if (parsed.isRefinement && previousIntent) {
            return mergeIntents(previousIntent, parsed);
        }
        
        return parsed;
    } catch (error) {
        console.error("[IntentParser] Failed to parse:", error);
        // Fallback: return a basic intent
        return {
            vibe: "any",
            filters: {},
            preferences: {
                traits: [],
                interests: [],
                personality: [],
            },
            semanticQuery: query,
            confidence: 0.3,
            isRefinement: false,
        };
    }
}

/**
 * Generate an embedding for the parsed intent's semantic query.
 * This is used for vector similarity search against profile embeddings.
 */
export async function embedIntent(intent: ParsedIntent): Promise<number[]> {
    return generateEmbedding(intent.semanticQuery);
}

/**
 * Merge a refinement intent with the previous intent.
 * "more like that but funnier" → keeps previous filters, adds "funny" trait
 */
function mergeIntents(previous: ParsedIntent, refinement: ParsedIntent): ParsedIntent {
    switch (refinement.refinementAction) {
        case "narrow":
            // Add new filters/preferences on top of existing
            return {
                ...previous,
                filters: { ...previous.filters, ...refinement.filters },
                preferences: {
                    traits: [...new Set([...previous.preferences.traits, ...refinement.preferences.traits])],
                    interests: [...new Set([...previous.preferences.interests, ...refinement.preferences.interests])],
                    personality: [...new Set([...previous.preferences.personality, ...refinement.preferences.personality])],
                    lookingFor: refinement.preferences.lookingFor || previous.preferences.lookingFor,
                    communicationStyle: refinement.preferences.communicationStyle || previous.preferences.communicationStyle,
                    loveLanguage: refinement.preferences.loveLanguage || previous.preferences.loveLanguage,
                },
                semanticQuery: `${previous.semanticQuery}. Also: ${refinement.semanticQuery}`,
                confidence: Math.min(previous.confidence, refinement.confidence),
                isRefinement: true,
                refinementAction: "narrow",
            };

        case "broaden":
            // Relax some filters
            return {
                ...previous,
                filters: refinement.filters, // Use the new, broader filters
                preferences: previous.preferences,
                semanticQuery: refinement.semanticQuery || previous.semanticQuery,
                confidence: refinement.confidence,
                isRefinement: true,
                refinementAction: "broaden",
            };

        case "more_like":
            // Keep everything the same, just asking for more results
            return {
                ...previous,
                isRefinement: true,
                refinementAction: "more_like",
            };

        case "different":
            // Complete pivot — use the new intent entirely
            return {
                ...refinement,
                isRefinement: true,
                refinementAction: "different",
            };

        default:
            // Smart merge: combine where possible
            return {
                vibe: refinement.vibe !== "any" ? refinement.vibe : previous.vibe,
                filters: { ...previous.filters, ...refinement.filters },
                preferences: {
                    traits: [...new Set([...previous.preferences.traits, ...refinement.preferences.traits])],
                    interests: [...new Set([...previous.preferences.interests, ...refinement.preferences.interests])],
                    personality: [...new Set([...previous.preferences.personality, ...refinement.preferences.personality])],
                    lookingFor: refinement.preferences.lookingFor || previous.preferences.lookingFor,
                    communicationStyle: refinement.preferences.communicationStyle || previous.preferences.communicationStyle,
                    loveLanguage: refinement.preferences.loveLanguage || previous.preferences.loveLanguage,
                },
                semanticQuery: refinement.semanticQuery,
                confidence: refinement.confidence,
                isRefinement: true,
                refinementAction: refinement.refinementAction,
            };
    }
}
