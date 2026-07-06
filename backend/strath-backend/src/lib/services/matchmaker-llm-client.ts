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

function uniqueStrings(values: string[]) {
    return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function asStringArray(value: unknown) {
    return Array.isArray(value)
        ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
        : [];
}

function readRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === "object" && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

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

function inferClarifierAnswerTraits(text: string) {
    const lower = text.toLowerCase();
    const traits: string[] = [];
    if (includesAny(lower, ["emotion", "mature", "maturity", "thoughtful", "intentional"])) traits.push("emotionally_mature", "consistent");
    if (includesAny(lower, ["quiet", "calm", "peaceful", "chill"])) traits.push("calm");
    if (includesAny(lower, ["low-drama", "low drama", "drama", "consistent", "loyal"])) traits.push("low_drama", "consistent");
    if (includesAny(lower, ["mix", "all three", "all of them", "all"])) traits.push("emotionally_mature", "calm", "low_drama", "consistent");
    return uniqueStrings(traits);
}

function latestAssistantAskedClarifier(input: MatchmakerLlmInput) {
    const latestAssistant = [...(input.recentMessages ?? [])]
        .reverse()
        .find((message) => message.role === "assistant");
    const text = latestAssistant?.text.toLowerCase() ?? "";
    return text.includes("what matters most")
        && text.includes("emotional maturity")
        && text.includes("quiet")
        && text.includes("low-drama");
}

function buildSearchPriorities(input: {
    traits: string[];
    activityRequirement?: string;
    relationshipIntent?: string;
    socialEnergy?: string;
}) {
    const priorities = new Set<string>();
    if (input.traits.includes("emotionally_mature") || input.traits.includes("mature")) priorities.add("emotional maturity");
    if (input.traits.includes("consistent")) priorities.add("consistency");
    if (input.traits.includes("low_drama")) priorities.add("low-drama profile signals");
    if (input.traits.includes("calm")) priorities.add("calm or grounded personality");
    if (input.traits.includes("serious") || input.relationshipIntent === "serious") priorities.add("intentional dating signals");
    if (input.traits.includes("social") || input.socialEnergy === "social") priorities.add("social energy and shared interests");
    if (input.activityRequirement === "active_today") priorities.add("recent activity");
    priorities.add("response likelihood");
    priorities.add("profile completeness");
    return [...priorities];
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
    const priorities = buildSearchPriorities({
        traits,
        activityRequirement,
        relationshipIntent,
        socialEnergy,
    });

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
            priorities,
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
- If the current state is clarifying, treat the user message as the answer to your previous question and return a search_plan.
- Never repeat the same clarifying question twice in a row.
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

function preventClarifyingLoop(input: MatchmakerLlmInput, turn: MatchmakerLlmTurn): MatchmakerLlmTurn {
    if (!turn.shouldClarify) return turn;
    if (input.state !== "clarifying" && !latestAssistantAskedClarifier(input)) return turn;

    const previousIntent = readRecord(input.currentIntent);
    const previousTraits = asStringArray(previousIntent.traits);
    const answerTraits = inferClarifierAnswerTraits(input.userMessage);
    const turnTraits = asStringArray(turn.intent.traits);
    const traits = uniqueStrings([...previousTraits, ...answerTraits, ...turnTraits]);
    const relationshipIntent = turn.intent.relationshipIntent !== "unknown"
        ? turn.intent.relationshipIntent
        : typeof previousIntent.relationshipIntent === "string"
            ? previousIntent.relationshipIntent as MatchmakerLlmTurn["intent"]["relationshipIntent"]
            : "unknown";
    const activityRequirement = turn.intent.activityRequirement !== "any"
        ? turn.intent.activityRequirement
        : typeof previousIntent.activityRequirement === "string"
            ? previousIntent.activityRequirement as MatchmakerLlmTurn["intent"]["activityRequirement"]
            : "any";
    const socialEnergy = traits.includes("calm")
        ? "quiet"
        : turn.intent.socialEnergy !== "unknown"
            ? turn.intent.socialEnergy
            : typeof previousIntent.socialEnergy === "string"
                ? previousIntent.socialEnergy as MatchmakerLlmTurn["intent"]["socialEnergy"]
                : "unknown";
    const priorities = buildSearchPriorities({
        traits,
        activityRequirement,
        relationshipIntent,
        socialEnergy,
    });
    const readablePriorities = priorities.slice(0, 3).join(", ");

    return {
        ...turn,
        messageType: "search_plan",
        shouldClarify: false,
        reply: `Got it. I will prioritize ${readablePriorities} and avoid people you have already passed or seen in this session. Should I go ahead?`,
        clarifyingQuestion: null,
        quickReplies: READY_REPLIES,
        intent: {
            ...turn.intent,
            rawText: [String(previousIntent.rawText ?? ""), input.userMessage].filter(Boolean).join(". "),
            traits,
            relationshipIntent,
            activityRequirement,
            socialEnergy,
        },
        searchPlan: {
            priorities,
            avoid: uniqueStrings([
                ...turn.searchPlan.avoid,
                "blocked users",
                "already passed users",
                "people already shown in this session",
            ]),
        },
    };
}

export async function generateMatchmakerLlmTurn(input: MatchmakerLlmInput): Promise<MatchmakerLlmTurn> {
    const provider = configuredProvider();
    try {
        if (provider === "gemini") return preventClarifyingLoop(input, await generateWithGemini(input));
        if (provider === "openai") return preventClarifyingLoop(input, await generateWithOpenAi(input));
        return preventClarifyingLoop(input, inferScriptedTurn(input));
    } catch (error) {
        console.warn("[matchmaker-llm] provider failed, falling back to scripted", {
            provider,
            error: error instanceof Error ? error.message : String(error),
        });
        return preventClarifyingLoop(input, {
            ...inferScriptedTurn(input),
            provider: "scripted",
            model: "scripted-v1",
            fallbackUsed: true,
        });
    }
}
