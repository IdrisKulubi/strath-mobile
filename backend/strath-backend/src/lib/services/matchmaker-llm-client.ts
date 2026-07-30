import { randomUUID } from "node:crypto";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import type { MatchmakerConversationState } from "@/lib/services/matchmaker-session-service";

export class MatchmakerLlmUnavailableError extends Error {
    readonly code = "MATCHMAKER_LLM_UNAVAILABLE";

    constructor(message = "Matchmaker is temporarily unavailable. Please try again.") {
        super(message);
        this.name = "MatchmakerLlmUnavailableError";
    }
}

export type MatchmakerLlmProvider = "scripted" | "openai" | "gemini";

export interface MatchmakerLlmInput {
    userMessage: string;
    state: MatchmakerConversationState;
    currentIntent?: Record<string, unknown>;
    recentMessages?: Array<{ role: "user" | "assistant" | "system"; text: string }>;
    memorySummary?: string | null;
}

export interface MatchmakerVoiceContext {
    recentMessages?: Array<{ role: "user" | "assistant" | "system"; text: string }>;
    memorySummary?: string | null;
}

export interface MatchmakerGreetingInput extends MatchmakerVoiceContext {
    firstName?: string | null;
}

export interface MatchmakerCandidateIntroInput extends MatchmakerVoiceContext {
    firstName?: string | null;
    age?: number | null;
    university?: string | null;
    course?: string | null;
    labels: string[];
    matchReason: string;
    intentText?: string;
}

export interface MatchmakerFeedbackReplyInput extends MatchmakerVoiceContext {
    outcome: string;
    reason?: string | null;
    asksForReason?: boolean;
    remainingSearches?: number;
}

export interface MatchmakerLimitReplyInput extends MatchmakerVoiceContext {
    used: number;
    limit: number;
}

export interface MatchmakerSearchStatusReplyInput extends MatchmakerVoiceContext {
    status: "needs_intent" | "no_result";
    intentText?: string;
}

export interface MatchmakerVoiceReply {
    text: string;
    provider: MatchmakerLlmProvider;
    model: string;
    fallbackUsed: boolean;
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

const SEARCH_REFINEMENT_REPLIES = new Set(
    READY_REPLIES.slice(1).map((reply) => reply.toLowerCase()),
);

const SEARCH_CONFIRMATION_PATTERNS = [
    /^yes\b/i,
    /^yeah\b/i,
    /^yep\b/i,
    /^yup\b/i,
    /^sure\b/i,
    /^ok(?:ay)?\b/i,
    /^please\b/i,
    /^go ahead\b/i,
    /^start(?:\s+now|\s+searching)?\b/i,
    /^search(?:\s+now)?\b/i,
    /^keep\s+(?:searching|going)\b/i,
    /^continue\b/i,
    /^find\s+(?:my\s+person|someone)\b/i,
    /^thanks?\b/i,
    /^thank\s+you\b/i,
    /^sounds?\s+good\b/i,
    /^let'?s\s+(?:go|do\s+it)\b/i,
    /^do\s+it\b/i,
    /^proceed\b/i,
];

const SEARCH_REFINEMENT_PATTERNS = [
    /change something/i,
    /make it more/i,
    /show someone active/i,
    /\btweak\b/i,
    /\badjust\b/i,
    /more serious/i,
    /less social/i,
    /\bdifferent\b/i,
];

export function isMatchmakerSearchRefinement(text: string) {
    const normalized = text.trim().toLowerCase();
    if (!normalized) return false;

    return SEARCH_REFINEMENT_REPLIES.has(normalized)
        || SEARCH_REFINEMENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isMatchmakerSearchConfirmation(text: string) {
    const normalized = text.trim().toLowerCase();
    if (!normalized || isMatchmakerSearchRefinement(normalized)) return false;

    if (
        normalized === "go ahead and search"
        || normalized === "find my person"
        || normalized === "search now"
    ) {
        return true;
    }

    if (
        normalized.includes("yes please")
        || normalized.includes("start now")
        || normalized.includes("start searching")
        || normalized.includes("keep searching")
        || normalized.includes("keep going")
    ) {
        return true;
    }

    return SEARCH_CONFIRMATION_PATTERNS.some((pattern) => pattern.test(normalized));
}

const CLARIFY_REPLIES = [
    "Emotionally mature",
    "Quiet and calm",
    "Low-drama and consistent",
    "A mix of all three",
];

const MATCHMAKER_VOICE_SYSTEM = `You are the StrathSpace matchmaker — a warm, perceptive friend helping university students find someone on campus. You sound human, not like a chatbot or customer support.

Voice rules:
- Short sentences. Campus-casual, never corporate.
- Mirror the user's energy when you have their words.
- One idea per message. No bullet lists in the spoken reply.
- Never invent profile details beyond what you are given.
- Never infer gender or pronouns. Use the candidate's first name or singular "they".
- Never promise a match or guarantee chemistry.
- Use first names only when provided.
- Avoid: "Got it.", "I understand.", "Certainly!", "As an AI", "I'd be happy to help."

Good tone examples:
- "Okay — calm and intentional. That's a clear direction. Want me to start searching?"
- "I'd start with Maya — active lately, with the calm, serious signals you asked me to prioritize."
- "Fair enough. Too much social energy can feel draining. I'll steer away from that next round."
`;

const MATCHMAKER_JSON_CONTRACT = `Return valid JSON only. Follow the matchmaker contract exactly.
The "reply" field must sound like the voice described above — warm, specific, and conversational.
Keep replies under 55 words.`;

const CONVERSATION_MODES = ["reflective", "direct", "curious", "warm"] as const;

const FORBIDDEN_REPLY_PATTERNS = [
    /got it\.?\s*i will prioritize/i,
    /should i go ahead\??/i,
    /avoid people you have already passed/i,
    /based on your preferences/i,
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
    const provider = (process.env.MATCHMAKER_LLM_PROVIDER || "openai").toLowerCase();
    if (provider === "openai" || provider === "gemini" || provider === "scripted") {
        return provider;
    }
    return "openai";
}

export function getMatchmakerLlmConfig() {
    const provider = configuredProvider();
    return {
        provider,
        model: process.env.MATCHMAKER_LLM_MODEL || (provider === "gemini" ? "gemini-2.0-flash" : "gpt-4.1-mini"),
        openAiKeyConfigured: Boolean(process.env.OPENAI_API_KEY?.trim()),
        geminiKeyConfigured: Boolean(process.env.GEMINI_API_KEY?.trim()),
    };
}

export function isForbiddenMatchmakerReply(text: string) {
    return containsForbiddenReply(text);
}

function buildVariationContext(input: MatchmakerVoiceContext) {
    const mode = CONVERSATION_MODES[Math.floor(Math.random() * CONVERSATION_MODES.length)];
    const openings = (input.recentMessages ?? [])
        .filter((message) => message.role === "assistant")
        .map((message) => message.text.split(/[.!?]/)[0]?.trim())
        .filter(Boolean)
        .slice(-4);

    return `Variation nonce: ${randomUUID().slice(0, 8)}
Conversational mode: ${mode}
Do not reuse these recent openings: ${openings.join(" | ") || "(none)"}`;
}

function containsForbiddenReply(text: string) {
    return FORBIDDEN_REPLY_PATTERNS.some((pattern) => pattern.test(text));
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

export function inferStructuredIntent(input: MatchmakerLlmInput) {
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
        shouldClarify,
        intent: {
            rawText: cleaned,
            traits: [...new Set(traits)],
            relationshipIntent,
            activityRequirement,
            socialEnergy,
            dealbreakers: [] as string[],
        },
        searchPlan: {
            priorities,
            avoid: ["blocked users", "already passed users", "people already shown in this session"],
        },
    };
}

export function buildClarifiedSearchPlanTurn(input: MatchmakerLlmInput, turn: MatchmakerLlmTurn): MatchmakerLlmTurn {
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

    return {
        ...turn,
        messageType: "search_plan",
        shouldClarify: false,
        reply: turn.reply,
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

function formatRecentMessages(messages?: MatchmakerVoiceContext["recentMessages"]) {
    return (messages ?? [])
        .slice(-8)
        .map((message) => `${message.role}: ${message.text}`)
        .join("\n");
}

function buildPrompt(input: MatchmakerLlmInput) {
    const recentMessages = formatRecentMessages(input.recentMessages);
    const memoryLine = input.memorySummary?.trim()
        ? `What you have learned about this user: ${input.memorySummary.trim()}`
        : "";
    const variation = buildVariationContext(input);

    return `${MATCHMAKER_VOICE_SYSTEM}

You are also extracting structured search intent for the backend.

Rules:
- Do not invent candidate profiles.
- Do not promise a match.
- If the user's request is vague, ask one useful clarifying question in your own words.
- If the current state is clarifying, treat the user message as the answer to your previous question and return a search_plan.
- Never repeat the same clarifying question twice in a row.
- If the user's intent is clear, produce a search plan the backend can use.
- For a search_plan reply, summarize the direction in one short message and ask if they want you to search now. Do not say you are already searching. Do not produce acknowledgment loops like "you're welcome" or "keep going".
- When state is ready_to_search, assume the backend will search after confirmation — do not ask permission again.
- Only ask a preference question when shouldClarify is true.
- Return valid JSON only.

${variation}

Current state: ${input.state}
Current intent: ${JSON.stringify(input.currentIntent ?? {})}
${memoryLine}
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
        quickReplies: parsed.shouldClarify ? CLARIFY_REPLIES : READY_REPLIES,
        provider,
        model,
        fallbackUsed: false,
    };
}

async function generateWithGemini(input: MatchmakerLlmInput): Promise<MatchmakerLlmTurn> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new MatchmakerLlmUnavailableError("Gemini API key is not configured");

    const model = process.env.MATCHMAKER_LLM_MODEL || "gemini-2.0-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
        model,
        generationConfig: {
            temperature: 0.82,
            maxOutputTokens: 900,
            responseMimeType: "application/json",
        },
    });

    const result = await geminiModel.generateContent({
        contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    });
    const turn = normalizeTurn(parseJsonObject(result.response.text()), "gemini", model);
    if (containsForbiddenReply(turn.reply)) {
        throw new MatchmakerLlmUnavailableError("Gemini returned a forbidden template-style reply");
    }
    return turn;
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

function cleanVoiceReply(text: string) {
    const cleaned = text.trim().replace(/^["']|["']$/g, "").trim();
    if (!cleaned) throw new Error("LLM returned an empty matchmaker reply");
    return cleaned.slice(0, 500);
}

function voiceContextBlock(input: MatchmakerVoiceContext) {
    const recentMessages = formatRecentMessages(input.recentMessages);
    return `What you have learned: ${input.memorySummary?.trim() || "(none)"}
Recent conversation:
${recentMessages || "(none)"}`;
}

async function callOpenAiVoice(task: string, temperature = 0.82): Promise<MatchmakerVoiceReply> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new MatchmakerLlmUnavailableError("OPENAI_API_KEY is not configured");

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
                    content: [{
                        type: "input_text",
                        text: `${MATCHMAKER_VOICE_SYSTEM}\nReturn only the spoken reply text. No quotes, JSON, or labels.`,
                    }],
                },
                {
                    role: "user",
                    content: [{ type: "input_text", text: task }],
                },
            ],
            temperature,
        }),
    });
    if (!response.ok) {
        const error = await response.text();
        throw new MatchmakerLlmUnavailableError(`OpenAI Responses API failed (${response.status}): ${error}`);
    }

    const text = cleanVoiceReply(extractOpenAiText(await response.json()));
    if (containsForbiddenReply(text)) {
        throw new MatchmakerLlmUnavailableError("OpenAI returned a forbidden template-style reply");
    }

    return {
        text,
        provider: "openai",
        model,
        fallbackUsed: false,
    };
}

async function callGeminiVoice(task: string, temperature = 0.82): Promise<MatchmakerVoiceReply> {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new MatchmakerLlmUnavailableError("Gemini API key is not configured");

    const model = process.env.MATCHMAKER_LLM_MODEL || "gemini-2.0-flash";
    const genAI = new GoogleGenerativeAI(apiKey);
    const geminiModel = genAI.getGenerativeModel({
        model,
        systemInstruction: `${MATCHMAKER_VOICE_SYSTEM}\nReturn only the spoken reply text. No quotes, JSON, or labels.`,
        generationConfig: {
            temperature,
            maxOutputTokens: 180,
        },
    });
    const result = await geminiModel.generateContent(task);
    const text = cleanVoiceReply(result.response.text());
    if (containsForbiddenReply(text)) {
        throw new MatchmakerLlmUnavailableError("Gemini returned a forbidden template-style reply");
    }

    return {
        text,
        provider: "gemini",
        model,
        fallbackUsed: false,
    };
}

async function generateVoiceReply(task: string, context: MatchmakerVoiceContext = {}): Promise<MatchmakerVoiceReply> {
    const provider = configuredProvider();
    const prompt = `${task}

${buildVariationContext(context)}
${voiceContextBlock(context)}`;

    if (provider === "openai") {
        try {
            return await callOpenAiVoice(prompt);
        } catch (error) {
            if (error instanceof MatchmakerLlmUnavailableError && error.message.includes("forbidden")) {
                return callOpenAiVoice(`${prompt}\nRewrite with completely fresh wording.`, 0.9);
            }
            throw error;
        }
    }

    if (provider === "gemini") {
        try {
            return await callGeminiVoice(prompt);
        } catch (error) {
            if (error instanceof MatchmakerLlmUnavailableError && error.message.includes("forbidden")) {
                return callGeminiVoice(`${prompt}\nRewrite with completely fresh wording.`, 0.9);
            }
            throw error;
        }
    }

    throw new MatchmakerLlmUnavailableError("Matchmaker LLM provider is not configured for conversational replies");
}

export function generateMatchmakerGreeting(
    input: MatchmakerGreetingInput,
): Promise<MatchmakerVoiceReply> {
    const name = input.firstName?.trim();
    return generateVoiceReply(
        `Write today's opening greeting. Ask what kind of person would feel right today.
First name: ${name || "(unknown)"}`,
        input,
    );
}

export async function generateMatchmakerCandidateIntro(
    input: MatchmakerCandidateIntroInput,
): Promise<MatchmakerVoiceReply> {
    const reply = await generateVoiceReply(
        `Introduce this real candidate and explain why they may fit.
Candidate facts are limited to labels and matchReason below.
Use only explicit candidate facts. Do not infer personality or gender.
Preserve time qualifiers exactly: "active recently" must not become "active today" or "around today".
The phrase "close to what was requested" is not evidence that the candidate has every requested trait.
Candidate: ${JSON.stringify({
            firstName: input.firstName,
            labels: input.labels,
            matchReason: input.matchReason,
        })}
Refer to the candidate by first name or singular "they".
Do not invite the user to chat or imply messaging is already available; the interface handles next actions.`,
        input,
    );
    const hasGenderedPronoun = /\b(?:she|her|hers|he|him|his)\b|(?:she|he)[’']s\b/i.test(reply.text);
    if (!hasGenderedPronoun) return reply;

    return generateVoiceReply(
        `Introduce this candidate again using only first name or "they". Never use gendered pronouns.
Candidate: ${JSON.stringify({
            firstName: input.firstName,
            labels: input.labels,
            matchReason: input.matchReason,
        })}`,
        input,
    );
}

export function generateMatchmakerFeedbackReply(
    input: MatchmakerFeedbackReplyInput,
): Promise<MatchmakerVoiceReply> {
    const remaining = input.remainingSearches ?? 0;
    let task: string;

    if (input.asksForReason) {
        task = "Ask one gentle, short question about what felt off.";
    } else if (input.outcome === "interested") {
        task = remaining > 0
            ? `The user marked interest in someone. Acknowledge that warmly in one or two short sentences. Mention they have ${remaining} search${remaining === 1 ? "" : "es"} left today and ask whether they want to keep looking while they wait for a response, or pause for now. Sound human, not robotic. Do not begin with Okay, Got it, or I understand.`
            : "The user marked interest in someone but has no searches left today. Acknowledge the interest warmly. Let them know they can fine-tune what they want while they wait for a response, and tomorrow's searches will use what you learned. Do not offer to search more today. Sound human, not robotic. Do not begin with Okay, Got it, or I understand.";
    } else {
        task = remaining > 0
            ? "Acknowledge the feedback and briefly say how it will shape the next search. Do not begin with Okay, Got it, or I understand."
            : "Acknowledge the feedback warmly. They have no searches left today, so invite one small refinement they can share now that will improve tomorrow's matches. Do not offer another search today. Do not begin with Okay, Got it, or I understand.";
    }

    return generateVoiceReply(
        `${task}
Feedback: ${JSON.stringify({ outcome: input.outcome, reason: input.reason ?? null, remainingSearches: remaining })}`,
        input,
    );
}

export function generateMatchmakerLimitReply(
    input: MatchmakerLimitReplyInput,
): Promise<MatchmakerVoiceReply> {
    return generateVoiceReply(
        `Warmly explain that today's search limit is reached. Their preferences were saved. Invite them to fine-tune one thing now — vibe, seriousness, or lifestyle — so tomorrow's searches start sharper. They can also ask for a date idea or profile tip. Do not mention internal policy. Sound warm and human.
Searches used: ${input.used} of ${input.limit}`,
        input,
    );
}

export function generateMatchmakerSearchStatusReply(
    input: MatchmakerSearchStatusReplyInput,
): Promise<MatchmakerVoiceReply> {
    const task = input.status === "needs_intent"
        ? "Ask the user for one useful detail about who would feel right before searching."
        : "Explain that no strong new candidate was found. Be encouraging and ask the user to adjust one preference without implying that no people exist.";
    return generateVoiceReply(
        `${task}
Current search direction: ${input.intentText || "(none)"}`,
        input,
    );
}

async function generateSearchConfirmationReply(
    input: MatchmakerLlmInput,
    turn: MatchmakerLlmTurn,
): Promise<string> {
    const reply = await generateVoiceReply(
        `The user just answered your clarifying question. Confirm the search direction in your own words and ask permission to search.
Structured intent: ${JSON.stringify({
            intent: turn.intent,
            priorities: turn.searchPlan.priorities.slice(0, 4),
        })}
User answer: ${input.userMessage}`,
        input,
    );
    return reply.text;
}

async function generateWithOpenAi(input: MatchmakerLlmInput): Promise<MatchmakerLlmTurn> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new MatchmakerLlmUnavailableError("OPENAI_API_KEY is not configured");

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
                            text: `${MATCHMAKER_VOICE_SYSTEM}\n\n${MATCHMAKER_JSON_CONTRACT}`,
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
            temperature: 0.82,
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new MatchmakerLlmUnavailableError(`OpenAI Responses API failed (${response.status}): ${error}`);
    }

    const turn = normalizeTurn(parseJsonObject(extractOpenAiText(await response.json())), "openai", model);
    if (containsForbiddenReply(turn.reply)) {
        throw new MatchmakerLlmUnavailableError("OpenAI returned a forbidden template-style reply");
    }
    return turn;
}

async function preventClarifyingLoop(input: MatchmakerLlmInput, turn: MatchmakerLlmTurn): Promise<MatchmakerLlmTurn> {
    if (!turn.shouldClarify) return turn;
    if (input.state !== "clarifying" && !latestAssistantAskedClarifier(input)) return turn;

    const merged = buildClarifiedSearchPlanTurn(input, turn);
    const reply = await generateSearchConfirmationReply(input, merged);
    return {
        ...merged,
        reply,
    };
}

export async function generateMatchmakerLlmTurn(input: MatchmakerLlmInput): Promise<MatchmakerLlmTurn> {
    const provider = configuredProvider();

    const run = async () => {
        if (provider === "gemini") return preventClarifyingLoop(input, await generateWithGemini(input));
        if (provider === "openai") return preventClarifyingLoop(input, await generateWithOpenAi(input));
        throw new MatchmakerLlmUnavailableError("Matchmaker LLM provider is not configured for conversational replies");
    };

    try {
        return await run();
    } catch (error) {
        if (error instanceof MatchmakerLlmUnavailableError) {
            throw error;
        }
        console.warn("[matchmaker-llm] provider failed, retrying once", {
            provider,
            error: error instanceof Error ? error.message : String(error),
        });
        try {
            return await run();
        } catch (retryError) {
            throw new MatchmakerLlmUnavailableError(
                retryError instanceof Error ? retryError.message : "Matchmaker LLM request failed",
            );
        }
    }
}
