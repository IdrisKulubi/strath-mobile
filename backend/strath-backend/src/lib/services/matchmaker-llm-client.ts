import { GoogleGenerativeAI } from "@google/generative-ai";
import { z } from "zod";

import type { MatchmakerConversationState } from "@/lib/services/matchmaker-session-service";

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
            ? "Tell me what matters most here — emotional maturity, a quieter personality, or someone low-drama and consistent?"
            : `Okay — I'd lean into ${[...priorities].slice(0, 3).join(", ")} and skip anyone you've already passed or seen today. Want me to search?`,
        clarifyingQuestion: shouldClarify
            ? "What matters most here — emotional maturity, a quieter personality, or someone low-drama and consistent?"
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

    return `${MATCHMAKER_VOICE_SYSTEM}

You are also extracting structured search intent for the backend.

Rules:
- Do not invent candidate profiles.
- Do not promise a match.
- If the user's request is vague, ask one useful clarifying question in your own words.
- If the current state is clarifying, treat the user message as the answer to your previous question and return a search_plan.
- Never repeat the same clarifying question twice in a row.
- If the user's intent is clear, produce a search plan the backend can use.
- For a search_plan reply, summarize the direction and ask permission to search. Do not ask another preference question.
- Only ask a preference question when shouldClarify is true.
- Return valid JSON only.

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
            temperature: 0.65,
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

async function generateVoiceReply(task: string, fallback: string): Promise<MatchmakerVoiceReply> {
    const provider = configuredProvider();

    try {
        if (provider === "openai") {
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
                    temperature: 0.75,
                }),
            });
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`OpenAI Responses API failed (${response.status}): ${error}`);
            }
            return {
                text: cleanVoiceReply(extractOpenAiText(await response.json())),
                provider,
                model,
                fallbackUsed: false,
            };
        }

        if (provider === "gemini") {
            const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
            if (!apiKey) throw new Error("Gemini API key is not configured");

            const model = process.env.MATCHMAKER_LLM_MODEL || "gemini-2.0-flash";
            const genAI = new GoogleGenerativeAI(apiKey);
            const geminiModel = genAI.getGenerativeModel({
                model,
                systemInstruction: `${MATCHMAKER_VOICE_SYSTEM}\nReturn only the spoken reply text. No quotes, JSON, or labels.`,
                generationConfig: {
                    temperature: 0.75,
                    maxOutputTokens: 180,
                },
            });
            const result = await geminiModel.generateContent(task);
            return {
                text: cleanVoiceReply(result.response.text()),
                provider,
                model,
                fallbackUsed: false,
            };
        }

        return {
            text: fallback,
            provider: "scripted",
            model: "scripted-v2",
            fallbackUsed: false,
        };
    } catch (error) {
        console.warn("[matchmaker-llm] voice generation failed, falling back to scripted", {
            provider,
            error: error instanceof Error ? error.message : String(error),
        });
        return {
            text: fallback,
            provider: "scripted",
            model: "scripted-v2",
            fallbackUsed: true,
        };
    }
}

export function generateMatchmakerGreeting(
    input: MatchmakerGreetingInput,
): Promise<MatchmakerVoiceReply> {
    const name = input.firstName?.trim();
    const fallback = name
        ? `Hey ${name}, who would feel right for you today? Tell me what matters, even if you're still figuring it out.`
        : "Hey, who would feel right for you today? Tell me what matters, even if you're still figuring it out.";
    return generateVoiceReply(
        `Write today's opening greeting. Ask what kind of person would feel right today.
First name: ${name || "(unknown)"}
${voiceContextBlock(input)}`,
        fallback,
    );
}

export async function generateMatchmakerCandidateIntro(
    input: MatchmakerCandidateIntroInput,
): Promise<MatchmakerVoiceReply> {
    const name = input.firstName?.trim() || "this person";
    const fallback = `I'd start with ${name}. ${input.matchReason}`;
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
        fallback,
    );
    const hasGenderedPronoun = /\b(?:she|her|hers|he|him|his)\b|(?:she|he)[’']s\b/i.test(reply.text);
    if (!hasGenderedPronoun) return reply;

    return {
        ...reply,
        text: fallback,
        fallbackUsed: true,
    };
}

export function generateMatchmakerFeedbackReply(
    input: MatchmakerFeedbackReplyInput,
): Promise<MatchmakerVoiceReply> {
    const fallback = input.asksForReason
        ? "What felt off about this one?"
        : input.outcome === "interested"
            ? "I can see why this one caught your attention. I'll keep that signal in mind for whoever I show you next."
            : input.reason
                ? `That helps—I'll steer away from ${input.reason.toLowerCase()} in the next search.`
                : "No problem. I'll adjust the next search instead of giving you more of the same.";
    return generateVoiceReply(
        `${input.asksForReason
            ? "Ask one gentle, short question about what felt off."
            : "Acknowledge the feedback and briefly say how it will shape the next search. Do not begin with Okay, Got it, or I understand."}
Feedback: ${JSON.stringify({ outcome: input.outcome, reason: input.reason ?? null })}
${voiceContextBlock(input)}`,
        fallback,
    );
}

export function generateMatchmakerLimitReply(
    input: MatchmakerLimitReplyInput,
): Promise<MatchmakerVoiceReply> {
    const fallback = "That's the strongest set I can responsibly show you today. I've kept what you told me, so tomorrow's search can pick up with a clearer sense of your type.";
    return generateVoiceReply(
        `Warmly explain that today's search limit is reached, their preferences were retained, and they can return tomorrow. Do not mention internal policy.
Searches used: ${input.used} of ${input.limit}
${voiceContextBlock(input)}`,
        fallback,
    );
}

export function generateMatchmakerSearchStatusReply(
    input: MatchmakerSearchStatusReplyInput,
): Promise<MatchmakerVoiceReply> {
    const fallback = input.status === "needs_intent"
        ? "Give me a little more to work with—what kind of person would feel right today?"
        : "I don't want to force a weak match from that direction. Change one thing that matters less, and I'll take another look.";
    const task = input.status === "needs_intent"
        ? "Ask the user for one useful detail about who would feel right before searching."
        : "Explain that no strong new candidate was found. Be encouraging and ask the user to adjust one preference without implying that no people exist.";
    return generateVoiceReply(
        `${task}
Current search direction: ${input.intentText || "(none)"}
${voiceContextBlock(input)}`,
        fallback,
    );
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
            temperature: 0.65,
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
