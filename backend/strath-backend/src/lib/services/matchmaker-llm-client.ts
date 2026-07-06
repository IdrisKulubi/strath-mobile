import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import type { MatchmakerConversationState } from "@/lib/services/matchmaker-session-service";

export type MatchmakerLlmProvider = "scripted" | "openai" | "gemini";

export interface MatchmakerLlmInput {
    userMessage: string;
    state: MatchmakerConversationState;
    currentIntent?: Record<string, unknown>;
    recentMessages?: Array<{ role: "user" | "assistant" | "system"; text: string }>;
}

export interface MatchmakerLlmTurn {
    messageType: "intent" | "clarifying_question" | "search_plan" | "small_talk";
    shouldClarify: boolean;
    reply: string;
    clarifyingQuestion?: string | null;
    quickReplies: string[];
    intent: {
        rawText: string;
        traits: string[];
        relationshipIntent?: "serious" | "casual" | "open" | "unknown";
        activityRequirement?: "active_today" | "active_recently" | "any";
        socialEnergy?: "quiet" | "balanced" | "social" | "unknown";
        dealbreakers: string[];
    };
    searchPlan: {
        priorities: string[];
        avoid: string[];
    };
    provider: MatchmakerLlmProvider;
    model: string;
    fallbackUsed: boolean;
}

const llmTurnSchema = z.object({
    messageType: z.enum(["intent", "clarifying_question", "search_plan", "small_talk"]).default("intent"),
    shouldClarify: z.boolean().default(false),
    reply: z.string().min(1).max(700),
    clarifyingQuestion: z.string().max(300).nullable().optional(),
    quickReplies: z.array(z.string().min(1).max(80)).max(4).default([]),
    intent: z.object({
        rawText: z.string().default(""),
        traits: z.array(z.string().min(1).max(40)).max(12).default([]),
        relationshipIntent: z.enum(["serious", "casual", "open", "unknown"]).default("unknown"),
        activityRequirement: z.enum(["active_today", "active_recently", "any"]).default("any"),
        socialEnergy: z.enum(["quiet", "balanced", "social", "unknown"]).default("unknown"),
        dealbreakers: z.array(z.string().min(1).max(80)).max(8).default([]),
    }),
    searchPlan: z.object({
        priorities: z.array(z.string().min(1).max(120)).max(8).default([]),
        avoid: z.array(z.string().min(1).max(120)).max(8).default([]),
    }),
});

const READY_REPLIES = [
    "Go ahead and search",
    "Change something",
    "Make it more serious",
    "Show someone active",
];

const CLARIFY_REPLIES = [
    "Emotionally mature",
    "Quiet and calm",
    "Low-drama and consistent",
    "A mix of all three",
];

function configuredProvider(): MatchmakerLlmProvider {
    const provider = (process.env.MATCHMAKER_LLM_PROVIDER || "scripted").toLowerCase();
    if (provider === "openai" || provider === "gemini" || provider === "scripted") {
        return provider;
    }
    return "scripted";
}

function normalizeText(text: string) {
    return text.trim().replace(/\s+/g, " ");
}

function includesAny(text: string, words: string[]) {
    const lower = text.toLowerCase();
    return words.some((word) => lower.includes(word));
}

function inferScriptedTurn(input: MatchmakerLlmInput): MatchmakerLlmTurn {
    const cleaned = normalizeText(input.userMessage);
    const lower = cleaned.toLowerCase();
    const traits: string[] = [];
    if (includesAny(lower, ["calm", "quiet", "chill", "peaceful", "low-drama", "low drama"])) traits.push("calm");
    if (includesAny(lower, ["serious", "intentional", "relationship", "long-term", "long term"])) traits.push("serious");
    if (includesAny(lower, ["social", "funny", "fun", "outgoing"])) traits.push("social");
    if (includesAny(lower, ["active", "today", "online", "available"])) traits.push("active_today");
    if (includesAny(lower, ["consistent", "loyal", "mature"])) traits.push("consistent");

    const shouldClarify = lower.length < 28 || lower === "i want someone calm" || lower === "someone serious";
    const activityRequirement = includesAny(lower, ["active", "today", "online", "available"]) ? "active_today" : "any";
    const relationshipIntent = includesAny(lower, ["serious", "intentional", "relationship", "long-term", "long term"])
        ? "serious"
        : "unknown";
    const socialEnergy = traits.includes("calm")
        ? "quiet"
        : traits.includes("social")
            ? "social"
            : "unknown";
    const priorities = new Set<string>();
    if (traits.includes("calm")) priorities.add("calm or grounded profile signals");
    if (traits.includes("serious")) priorities.add("intentional dating signals");
    if (traits.includes("social")) priorities.add("social energy and shared interests");
    if (activityRequirement === "active_today") priorities.add("recent activity");
    priorities.add("response likelihood");
    priorities.add("profile completeness");

    return {
        messageType: shouldClarify ? "clarifying_question" : "search_plan",
        shouldClarify,
        reply: shouldClarify
            ? "When you say that, what matters most: emotional maturity, a quiet personality, or someone low-drama and consistent?"
            : `That makes sense. I would search for ${[...priorities].slice(0, 3).join(", ")} and avoid people you have already passed or seen in this session. Should I go ahead?`,
        clarifyingQuestion: shouldClarify
            ? "What matters most: emotional maturity, a quiet personality, or someone low-drama and consistent?"
            : null,
        quickReplies: shouldClarify ? CLARIFY_REPLIES : READY_REPLIES,
        intent: {
            rawText: cleaned,
            traits: [...new Set(traits)],
            relationshipIntent,
            activityRequirement,
            socialEnergy,
            dealbreakers: [],
        },
        searchPlan: {
            priorities: [...priorities],
            avoid: ["blocked users", "already passed users", "people already shown in this session"],
        },
        provider: "scripted",
        model: "scripted-v1",
        fallbackUsed: false,
    };
}

function buildPrompt(input: MatchmakerLlmInput) {
    const recentMessages = (input.recentMessages ?? [])
        .slice(-8)
        .map((message) => `${message.role}: ${message.text}`)
        .join("\n");

    return `You are the StrathSpace AI matchmaker for university students.
Your goal is to help the user find a partner inside StrathSpace.
You are warm, direct, emotionally intelligent, and practical.

Rules:
- Do not act like a generic chatbot.
- Do not invent candidate profiles.
- Do not promise a match.
- If the user's request is vague, ask one useful clarifying question.
- If the user's intent is clear, produce a search plan the backend can use.
- Keep replies under 80 words.
- Return valid JSON only.

Current state: ${input.state}
Current intent: ${JSON.stringify(input.currentIntent ?? {})}
Recent conversation:
${recentMessages || "(none)"}

User message: ${input.userMessage}

Return this JSON shape:
{
  "messageType": "intent" | "clarifying_question" | "search_plan" | "small_talk",
  "shouldClarify": boolean,
  "reply": "human matchmaker reply",
  "clarifyingQuestion": "question or null",
  "quickReplies": ["up to four short replies"],
  "intent": {
    "rawText": "user request",
    "traits": ["short trait tags"],
    "relationshipIntent": "serious" | "casual" | "open" | "unknown",
    "activityRequirement": "active_today" | "active_recently" | "any",
    "socialEnergy": "quiet" | "balanced" | "social" | "unknown",
    "dealbreakers": ["only explicit dealbreakers"]
  },
  "searchPlan": {
    "priorities": ["backend-safe search priorities"],
    "avoid": ["backend-safe exclusions"]
  }
}`;
}

function parseJsonObject(text: string) {
    const trimmed = text.trim();
    try {
        return JSON.parse(trimmed);
    } catch {
        const start = trimmed.indexOf("{");
        const end = trimmed.lastIndexOf("}");
        if (start >= 0 && end > start) {
            return JSON.parse(trimmed.slice(start, end + 1));
        }
        throw new Error("LLM did not return JSON");
    }
}

function normalizeTurn(raw: unknown, provider: MatchmakerLlmProvider, model: string): MatchmakerLlmTurn {
    const parsed = llmTurnSchema.parse(raw);
    const reply = parsed.shouldClarify && parsed.clarifyingQuestion
        ? parsed.clarifyingQuestion
        : parsed.reply;

    return {
        ...parsed,
        reply,
        quickReplies: parsed.quickReplies.length > 0
            ? parsed.quickReplies
            : parsed.shouldClarify
                ? CLARIFY_REPLIES
                : READY_REPLIES,
        provider,
        model,
        fallbackUsed: false,
    };
}

async function generateWithGemini(input: MatchmakerLlmInput): Promise<MatchmakerLlmTurn> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API key is not configured");

    const model = process.env.MATCHMAKER_LLM_MODEL || "gemini-2.0-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 900,
            responseMimeType: "application/json",
        },
    });

    const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    });
    return normalizeTurn(parseJsonObject(result.response.text()), "gemini", model);
}

function extractOpenAiText(data: unknown) {
    const response = data as {
        output_text?: string;
        output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
    };
    if (typeof response.output_text === "string") return response.output_text;
    for (const item of response.output ?? []) {
        for (const content of item.content ?? []) {
            if (typeof content.text === "string") return content.text;
        }
    }
    throw new Error("OpenAI response did not include text output");
}

async function generateWithOpenAi(input: MatchmakerLlmInput): Promise<MatchmakerLlmTurn> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured");

    const model = process.env.MATCHMAKER_LLM_MODEL || "gpt-4.1-mini";
    const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model,
            input: [
                {
                    role: "developer",
                    content: [
                        {
                            type: "input_text",
                            text: "Return valid JSON only. Follow the matchmaker contract exactly.",
                        },
                    ],
                },
                {
                    role: "user",
                    content: [{ type: "input_text", text: buildPrompt(input) }],
                },
            ],
            text: {
                format: { type: "json_object" },
            },
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI Responses API failed (${response.status}): ${error}`);
    }

    return normalizeTurn(parseJsonObject(extractOpenAiText(await response.json())), "openai", model);
}

export async function generateMatchmakerLlmTurn(input: MatchmakerLlmInput): Promise<MatchmakerLlmTurn> {
    const provider = configuredProvider();
    try {
        if (provider === "gemini") return await generateWithGemini(input);
        if (provider === "openai") return await generateWithOpenAi(input);
        return inferScriptedTurn(input);
    } catch (error) {
        console.warn("[matchmaker-llm] provider failed, falling back to scripted", {
            provider,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            ...inferScriptedTurn(input),
            provider: "scripted",
            model: "scripted-v1",
            fallbackUsed: true,
        };
    }
}
