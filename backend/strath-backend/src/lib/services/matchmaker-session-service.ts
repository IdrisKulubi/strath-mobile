import { and, asc, desc, eq } from "drizzle-orm";

import db from "@/db/drizzle";
import { matchmakerMessages, matchmakerSessions, profiles } from "@/db/schema";
import {
    generateMatchmakerFeedbackReply,
    generateMatchmakerGreeting,
    generateMatchmakerDateIdeaReply,
    generateMatchmakerLimitReply,
    generateMatchmakerLlmTurn,
    generateMatchmakerProfileTipsReply,
    generateMatchmakerRefinePromptReply,
    generateMatchmakerRefineSavedReply,
    isMatchmakerSearchConfirmation,
} from "@/lib/services/matchmaker-llm-client";
import {
    getMatchmakerUserMemory,
    recordMatchmakerFeedback,
    type MatchmakerFeedbackOutcome,
} from "@/lib/services/matchmaker-memory-service";
import { getPhotoImprovementTips } from "@/lib/services/photo-intelligence-service";
import { trackMatchmakerEvent } from "@/lib/services/matchmaker-analytics-service";
import { presentNextMatchmakerCandidate } from "@/lib/services/matchmaker-session-search-service";

export type MatchmakerConversationState =
    | "greeting"
    | "collecting_intent"
    | "clarifying"
    | "ready_to_search"
    | "presenting_candidate"
    | "collecting_feedback"
    | "limit_reached";

export type MatchmakerMessageRole = "user" | "assistant" | "system";
export type MatchmakerMessageKind =
    | "greeting"
    | "text"
    | "intent"
    | "clarifying_question"
    | "search_plan"
    | "candidate"
    | "feedback"
    | "limit";

export interface MatchmakerConversationMessage {
    id: string;
    role: MatchmakerMessageRole;
    kind: MatchmakerMessageKind;
    text: string;
    quickReplies: string[];
    metadata: Record<string, unknown>;
    createdAt: string;
}

export interface MatchmakerConversationSession {
    id: string;
    state: MatchmakerConversationState;
    status: "active" | "completed" | "expired";
    sessionDay: string;
    dailySearchCount: number;
    searchLimit: number;
    remainingSearches: number;
    currentIntent: Record<string, unknown>;
    currentPlan: Record<string, unknown>;
    quota: {
        used: number;
        limit: number;
        remaining: number;
        resetsAt: string;
        timezone: "Africa/Nairobi";
        limitReason: "daily_search_limit" | null;
    };
}

export interface MatchmakerConversationResponse {
    session: MatchmakerConversationSession;
    messages: MatchmakerConversationMessage[];
    quickReplies: string[];
}

export const MATCHMAKER_VOICE_VERSION = "v3-no-templates";

const DEFAULT_SEARCH_LIMIT = Number(process.env.MATCHMAKER_DAILY_SEARCH_LIMIT || 3);

const INITIAL_QUICK_REPLIES = [
    "I want someone calm",
    "Someone serious",
    "Someone active today",
    "Help me figure it out",
];

const LIMIT_REFINE_QUICK_REPLIES = [
    "Help me refine my type",
    "What should I improve?",
    "Give me a date idea",
];

const LIMIT_CHIP_REFINE = "Help me refine my type";
const LIMIT_CHIP_PROFILE_TIPS = "What should I improve?";
const LIMIT_CHIP_DATE_IDEA = "Give me a date idea";
const LIMIT_CHIP_SAVE_TOMORROW = "Save this for tomorrow";

type MatchmakerLimitMode = "idle" | "refine_type" | "date_idea";

type MatchmakerLimitAction =
    | "entry"
    | "refine_prompt"
    | "refine_saved"
    | "profile_tips"
    | "date_idea"
    | "date_idea_followup"
    | "save_tomorrow";

function getRemainingSearches(session: typeof matchmakerSessions.$inferSelect) {
    return Math.max(0, session.searchLimit - session.dailySearchCount);
}

function getSessionLimitMode(session: typeof matchmakerSessions.$inferSelect): MatchmakerLimitMode {
    const mode = readSessionMetadata(session).limitMode;
    if (mode === "refine_type" || mode === "date_idea") return mode;
    return "idle";
}

async function setSessionLimitMode(
    sessionId: string,
    session: typeof matchmakerSessions.$inferSelect,
    limitMode: MatchmakerLimitMode,
) {
    await db
        .update(matchmakerSessions)
        .set({
            metadata: {
                ...readSessionMetadata(session),
                limitMode,
            },
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, sessionId));
}

async function loadProfileSnapshot(userId: string) {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: {
            firstName: true,
            bio: true,
            aboutMe: true,
            interests: true,
            photos: true,
            profilePhoto: true,
            lookingFor: true,
            course: true,
            university: true,
        },
    });

    const photos = Array.isArray(profile?.photos) ? profile.photos : [];
    return {
        firstName: profile?.firstName ?? null,
        bio: profile?.bio || profile?.aboutMe || null,
        interests: Array.isArray(profile?.interests) ? profile.interests.filter(Boolean).slice(0, 8) : [],
        photoCount: photos.length + (profile?.profilePhoto ? 1 : 0),
        lookingFor: profile?.lookingFor ?? null,
        course: profile?.course ?? null,
        university: profile?.university ?? null,
    };
}

function buildIntentText(session: typeof matchmakerSessions.$inferSelect) {
    const intent = session.currentIntent ?? {};
    const lastUserMessage = typeof intent.lastUserMessage === "string" ? intent.lastUserMessage : "";
    const traits = Array.isArray(intent.traits)
        ? intent.traits.filter((trait): trait is string => typeof trait === "string")
        : [];
    return [lastUserMessage, ...traits].filter(Boolean).join(". ");
}

async function createLimitAssistantMessage(input: {
    sessionId: string;
    session: typeof matchmakerSessions.$inferSelect;
    text: string;
    quickReplies?: string[];
    limitMode: MatchmakerLimitMode;
    limitAction: MatchmakerLimitAction;
    provider?: string;
    model?: string;
    fallbackUsed?: boolean;
}) {
    await db
        .update(matchmakerSessions)
        .set({
            state: "limit_reached",
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, input.sessionId));

    await createMessage({
        sessionId: input.sessionId,
        role: "assistant",
        kind: "limit",
        text: input.text,
        quickReplies: input.quickReplies ?? LIMIT_REFINE_QUICK_REPLIES,
        metadata: {
            limitReason: "daily_search_limit",
            used: input.session.dailySearchCount,
            limit: input.session.searchLimit,
            limitMode: input.limitMode,
            limitAction: input.limitAction,
            provider: input.provider,
            model: input.model,
            fallbackUsed: input.fallbackUsed,
        },
    });
}

async function respondAtSearchLimit(input: {
    sessionId: string;
    userId: string;
    session: typeof matchmakerSessions.$inferSelect;
}) {
    const recentMessages = await listMessages(input.sessionId);
    const memory = await getMatchmakerUserMemory(input.userId);
    const reply = await generateMatchmakerLimitReply({
        memorySummary: memory?.memorySummary,
        recentMessages: recentMessages.map((message) => ({
            role: message.role,
            text: message.text,
        })),
        used: input.session.dailySearchCount,
        limit: input.session.searchLimit,
    });

    await setSessionLimitMode(input.sessionId, input.session, "idle");
    await createLimitAssistantMessage({
        sessionId: input.sessionId,
        session: input.session,
        text: reply.text,
        quickReplies: LIMIT_REFINE_QUICK_REPLIES,
        limitMode: "idle",
        limitAction: "entry",
        provider: reply.provider,
        model: reply.model,
        fallbackUsed: reply.fallbackUsed,
    });

    return buildResponse(input.sessionId);
}

async function handleLimitConversationMessage(input: {
    sessionId: string;
    userId: string;
    session: typeof matchmakerSessions.$inferSelect;
    userMessage: string;
}) {
    const recentMessages = await listMessages(input.sessionId);
    const memory = await getMatchmakerUserMemory(input.userId);
    const limitMode = getSessionLimitMode(input.session);
    const voiceContext = {
        memorySummary: memory?.memorySummary,
        recentMessages: recentMessages.map((message) => ({
            role: message.role,
            text: message.text,
        })),
    };
    const intentText = buildIntentText(input.session);

    if (input.userMessage === LIMIT_CHIP_REFINE) {
        const reply = await generateMatchmakerRefinePromptReply(voiceContext);
        await setSessionLimitMode(input.sessionId, input.session, "refine_type");
        await createLimitAssistantMessage({
            sessionId: input.sessionId,
            session: input.session,
            text: reply.text,
            quickReplies: [],
            limitMode: "refine_type",
            limitAction: "refine_prompt",
            provider: reply.provider,
            model: reply.model,
            fallbackUsed: reply.fallbackUsed,
        });
        return buildResponse(input.sessionId);
    }

    if (input.userMessage === LIMIT_CHIP_PROFILE_TIPS) {
        const [profile, photoTips] = await Promise.all([
            loadProfileSnapshot(input.userId),
            getPhotoImprovementTips(input.userId),
        ]);
        const reply = await generateMatchmakerProfileTipsReply({
            ...voiceContext,
            profile,
            photoTips,
        });
        await setSessionLimitMode(input.sessionId, input.session, "idle");
        await createLimitAssistantMessage({
            sessionId: input.sessionId,
            session: input.session,
            text: reply.text,
            quickReplies: LIMIT_REFINE_QUICK_REPLIES,
            limitMode: "idle",
            limitAction: "profile_tips",
            provider: reply.provider,
            model: reply.model,
            fallbackUsed: reply.fallbackUsed,
        });
        return buildResponse(input.sessionId);
    }

    if (input.userMessage === LIMIT_CHIP_DATE_IDEA) {
        const reply = await generateMatchmakerDateIdeaReply({
            ...voiceContext,
            intentText,
            userMessage: input.userMessage,
            followUp: false,
        });
        await setSessionLimitMode(input.sessionId, input.session, "date_idea");
        await createLimitAssistantMessage({
            sessionId: input.sessionId,
            session: input.session,
            text: reply.text,
            quickReplies: [],
            limitMode: "date_idea",
            limitAction: "date_idea",
            provider: reply.provider,
            model: reply.model,
            fallbackUsed: reply.fallbackUsed,
        });
        return buildResponse(input.sessionId);
    }

    if (input.userMessage === LIMIT_CHIP_SAVE_TOMORROW) {
        const reply = await generateMatchmakerRefineSavedReply({
            ...voiceContext,
            userMessage: intentText || "today's direction",
        });
        await setSessionLimitMode(input.sessionId, input.session, "idle");
        await createLimitAssistantMessage({
            sessionId: input.sessionId,
            session: input.session,
            text: reply.text,
            quickReplies: LIMIT_REFINE_QUICK_REPLIES,
            limitMode: "idle",
            limitAction: "save_tomorrow",
            provider: reply.provider,
            model: reply.model,
            fallbackUsed: reply.fallbackUsed,
        });
        return buildResponse(input.sessionId);
    }

    if (limitMode === "refine_type") {
        const recorded = await recordMatchmakerFeedback({
            userId: input.userId,
            outcome: "refinement",
            reason: input.userMessage,
            metadata: {
                source: "matchmaker_conversation_limit",
                sessionId: input.sessionId,
            },
        });
        const reply = await generateMatchmakerRefineSavedReply({
            memorySummary: recorded.memorySummary,
            recentMessages: voiceContext.recentMessages,
            userMessage: input.userMessage,
        });
        await setSessionLimitMode(input.sessionId, input.session, "idle");
        await createLimitAssistantMessage({
            sessionId: input.sessionId,
            session: input.session,
            text: reply.text,
            quickReplies: LIMIT_REFINE_QUICK_REPLIES,
            limitMode: "idle",
            limitAction: "refine_saved",
            provider: reply.provider,
            model: reply.model,
            fallbackUsed: reply.fallbackUsed,
        });
        return buildResponse(input.sessionId);
    }

    if (limitMode === "date_idea") {
        const reply = await generateMatchmakerDateIdeaReply({
            ...voiceContext,
            intentText,
            userMessage: input.userMessage,
            followUp: true,
        });
        await setSessionLimitMode(input.sessionId, input.session, "date_idea");
        await createLimitAssistantMessage({
            sessionId: input.sessionId,
            session: input.session,
            text: reply.text,
            quickReplies: [],
            limitMode: "date_idea",
            limitAction: "date_idea_followup",
            provider: reply.provider,
            model: reply.model,
            fallbackUsed: reply.fallbackUsed,
        });
        return buildResponse(input.sessionId);
    }

    const reply = await generateMatchmakerLimitReply({
        ...voiceContext,
        used: input.session.dailySearchCount,
        limit: input.session.searchLimit,
    });
    await setSessionLimitMode(input.sessionId, input.session, "idle");
    await createLimitAssistantMessage({
        sessionId: input.sessionId,
        session: input.session,
        text: reply.text,
        quickReplies: LIMIT_REFINE_QUICK_REPLIES,
        limitMode: "idle",
        limitAction: "entry",
        provider: reply.provider,
        model: reply.model,
        fallbackUsed: reply.fallbackUsed,
    });
    return buildResponse(input.sessionId);
}

function getNairobiDay(date = new Date()) {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function getNairobiResetAt(date = new Date()) {
    const day = getNairobiDay(date);
    const [year, month, dateOfMonth] = day.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, dateOfMonth + 1, -3, 0, 0)).toISOString();
}

function normalizeText(text: string) {
    return text.trim().replace(/\s+/g, " ");
}

function serializeMessage(row: typeof matchmakerMessages.$inferSelect): MatchmakerConversationMessage {
    return {
        id: row.id,
        role: row.role,
        kind: row.kind,
        text: row.text,
        quickReplies: row.quickReplies ?? [],
        metadata: row.metadata ?? {},
        createdAt: row.createdAt.toISOString(),
    };
}

function serializeSession(row: typeof matchmakerSessions.$inferSelect): MatchmakerConversationSession {
    const remainingSearches = Math.max(0, row.searchLimit - row.dailySearchCount);
    return {
        id: row.id,
        state: row.state,
        status: row.status,
        sessionDay: row.sessionDay,
        dailySearchCount: row.dailySearchCount,
        searchLimit: row.searchLimit,
        remainingSearches,
        currentIntent: row.currentIntent ?? {},
        currentPlan: row.currentPlan ?? {},
        quota: {
            used: row.dailySearchCount,
            limit: row.searchLimit,
            remaining: remainingSearches,
            resetsAt: getNairobiResetAt(),
            timezone: "Africa/Nairobi",
            limitReason: remainingSearches <= 0 ? "daily_search_limit" : null,
        },
    };
}

async function getUserFirstName(userId: string) {
    const profile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        columns: { firstName: true },
    });
    return profile?.firstName ?? null;
}

async function listMessages(sessionId: string) {
    const rows = await db.query.matchmakerMessages.findMany({
        where: eq(matchmakerMessages.sessionId, sessionId),
        orderBy: [asc(matchmakerMessages.createdAt)],
    });
    return rows.map(serializeMessage);
}

async function createMessage(input: {
    sessionId: string;
    role: MatchmakerMessageRole;
    kind: MatchmakerMessageKind;
    text: string;
    quickReplies?: string[];
    metadata?: Record<string, unknown>;
}) {
    const [message] = await db
        .insert(matchmakerMessages)
        .values({
            sessionId: input.sessionId,
            role: input.role,
            kind: input.kind,
            text: input.text,
            quickReplies: input.quickReplies ?? [],
            metadata: input.metadata ?? {},
        })
        .returning();
    return message;
}

async function ensureGreeting(session: typeof matchmakerSessions.$inferSelect) {
    const existing = await db.query.matchmakerMessages.findFirst({
        where: eq(matchmakerMessages.sessionId, session.id),
    });
    if (existing) return;

    const firstName = await getUserFirstName(session.userId);
    const greeting = await generateMatchmakerGreeting({ firstName });
    await createMessage({
        sessionId: session.id,
        role: "assistant",
        kind: "greeting",
        text: greeting.text,
        quickReplies: INITIAL_QUICK_REPLIES,
        metadata: {
            provider: greeting.provider,
            model: greeting.model,
            fallbackUsed: greeting.fallbackUsed,
            voiceVersion: MATCHMAKER_VOICE_VERSION,
        },
    });
}

function readSessionMetadata(row: typeof matchmakerSessions.$inferSelect) {
    return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? row.metadata as Record<string, unknown>
        : {};
}

function hasCurrentVoiceVersion(row: typeof matchmakerSessions.$inferSelect) {
    return readSessionMetadata(row).voiceVersion === MATCHMAKER_VOICE_VERSION;
}

async function expireSession(sessionId: string) {
    await db
        .update(matchmakerSessions)
        .set({
            status: "expired",
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, sessionId));
}

async function createSession(userId: string, sessionDay: string) {
    const [created] = await db
        .insert(matchmakerSessions)
        .values({
            userId,
            sessionDay,
            status: "active",
            state: "greeting",
            searchLimit: Math.max(1, DEFAULT_SEARCH_LIMIT),
            metadata: {
                phase: "conversational_matchmaker",
                voiceVersion: MATCHMAKER_VOICE_VERSION,
            },
        })
        .returning();
    await ensureGreeting(created);
    trackMatchmakerEvent({
        event: "session_started",
        userId,
        sessionId: created.id,
        metadata: {
            sessionDay,
            searchLimit: created.searchLimit,
            voiceVersion: MATCHMAKER_VOICE_VERSION,
        },
    }).catch(() => undefined);
    return created;
}

async function getOrCreateRawSession(userId: string) {
    const sessionDay = getNairobiDay();
    const existing = await db.query.matchmakerSessions.findFirst({
        where: and(
            eq(matchmakerSessions.userId, userId),
            eq(matchmakerSessions.sessionDay, sessionDay),
            eq(matchmakerSessions.status, "active"),
        ),
        orderBy: [desc(matchmakerSessions.updatedAt)],
    });
    if (existing) {
        if (!hasCurrentVoiceVersion(existing)) {
            await expireSession(existing.id);
            return createSession(userId, sessionDay);
        }
        await ensureGreeting(existing);
        return existing;
    }

    return createSession(userId, sessionDay);
}

async function buildResponse(sessionId: string): Promise<MatchmakerConversationResponse> {
    const session = await db.query.matchmakerSessions.findFirst({
        where: eq(matchmakerSessions.id, sessionId),
    });
    if (!session) throw new Error("Matchmaker session not found");

    const messages = await listMessages(session.id);
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");

    return {
        session: serializeSession(session),
        messages,
        quickReplies: latestAssistant?.quickReplies ?? [],
    };
}

export async function getOrCreateMatchmakerConversation(userId: string) {
    const session = await getOrCreateRawSession(userId);
    return buildResponse(session.id);
}

function isAwaitingSearchConfirmation(
    state: MatchmakerConversationState,
    messages: MatchmakerConversationMessage[],
) {
    if (state === "ready_to_search") return true;
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    return latestAssistant?.kind === "search_plan";
}

export async function addMatchmakerConversationMessage(input: {
    userId: string;
    text: string;
}) {
    const cleaned = normalizeText(input.text);
    if (cleaned.length < 1) throw new Error("Message is required");
    if (cleaned.length > 800) throw new Error("Message is too long");

    const session = await getOrCreateRawSession(input.userId);
    const existingMessages = await listMessages(session.id);
    const remainingSearches = getRemainingSearches(session);

    if (
        isAwaitingSearchConfirmation(session.state, existingMessages)
        && isMatchmakerSearchConfirmation(cleaned)
    ) {
        await createMessage({
            sessionId: session.id,
            role: "user",
            kind: "text",
            text: cleaned,
        });

        if (remainingSearches <= 0) {
            trackMatchmakerEvent({
                event: "search_blocked_limit",
                userId: input.userId,
                sessionId: session.id,
                metadata: {
                    confirmedVia: "message",
                    messageLength: cleaned.length,
                },
            }).catch(() => undefined);

            return respondAtSearchLimit({
                sessionId: session.id,
                userId: input.userId,
                session,
            });
        }

        trackMatchmakerEvent({
            event: "search_plan_confirmed",
            userId: input.userId,
            sessionId: session.id,
            metadata: {
                confirmedVia: "message",
                messageLength: cleaned.length,
            },
        }).catch(() => undefined);

        const refreshedSession = await db.query.matchmakerSessions.findFirst({
            where: eq(matchmakerSessions.id, session.id),
        });
        if (!refreshedSession) throw new Error("Matchmaker session not found");

        await presentNextMatchmakerCandidate(refreshedSession);
        return buildResponse(session.id);
    }

    if (remainingSearches <= 0) {
        await createMessage({
            sessionId: session.id,
            role: "user",
            kind: "text",
            text: cleaned,
        });
        trackMatchmakerEvent({
            event: "limit_refinement_submitted",
            userId: input.userId,
            sessionId: session.id,
            metadata: {
                state: session.state,
                messageLength: cleaned.length,
            },
        }).catch(() => undefined);

        return handleLimitConversationMessage({
            sessionId: session.id,
            userId: input.userId,
            session,
            userMessage: cleaned,
        });
    }

    const memory = await getMatchmakerUserMemory(input.userId);
    const llmTurn = await generateMatchmakerLlmTurn({
        userMessage: cleaned,
        state: session.state,
        currentIntent: session.currentIntent ?? {},
        memorySummary: memory?.memorySummary,
        recentMessages: existingMessages.map((message) => ({
            role: message.role,
            text: message.text,
        })),
    });

    await createMessage({
        sessionId: session.id,
        role: "user",
        kind: "text",
        text: cleaned,
    });
    trackMatchmakerEvent({
        event: "intent_submitted",
        userId: input.userId,
        sessionId: session.id,
        metadata: {
            state: session.state,
            messageLength: cleaned.length,
        },
    }).catch(() => undefined);
    const nextState: MatchmakerConversationState = llmTurn.shouldClarify
        ? "clarifying"
        : "ready_to_search";
    const currentIntent = {
        ...llmTurn.intent,
        lastUserMessage: cleaned,
        provider: llmTurn.provider,
        model: llmTurn.model,
    };
    const plan = {
        ...llmTurn.searchPlan,
        intent: llmTurn.intent,
    };

    await db
        .update(matchmakerSessions)
        .set({
            state: nextState,
            currentIntent,
            currentPlan: plan,
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, session.id));

    await createMessage({
        sessionId: session.id,
        role: "assistant",
        kind: llmTurn.shouldClarify ? "clarifying_question" : "search_plan",
        text: llmTurn.reply,
        quickReplies: llmTurn.quickReplies,
        metadata: {
            intent: currentIntent,
            plan,
            provider: llmTurn.provider,
            model: llmTurn.model,
            fallbackUsed: llmTurn.fallbackUsed,
            messageType: llmTurn.messageType,
        },
    });
    trackMatchmakerEvent({
        event: llmTurn.shouldClarify ? "clarification_asked" : "search_plan_confirmed",
        userId: input.userId,
        sessionId: session.id,
        metadata: {
            provider: llmTurn.provider,
            model: llmTurn.model,
            fallbackUsed: llmTurn.fallbackUsed,
            messageType: llmTurn.messageType,
            quickReplyCount: llmTurn.quickReplies.length,
        },
    }).catch(() => undefined);

    return buildResponse(session.id);
}

export async function presentNextMatchmakerCandidateForUser(userId: string) {
    const session = await getOrCreateRawSession(userId);
    await presentNextMatchmakerCandidate(session);
    return buildResponse(session.id);
}

function buildFeedbackQuickReplies(input: {
    outcome: MatchmakerFeedbackOutcome;
    wantsReason: boolean;
    remainingSearches: number;
}): string[] {
    if (input.wantsReason) {
        return [
            "Not my vibe",
            "Too social",
            "Too quiet",
            "Not serious enough",
            "Not active enough",
            "Different lifestyle",
            "Skip feedback",
        ];
    }

    if (input.outcome === "interested") {
        if (input.remainingSearches > 0) {
            return [
                "Keep looking",
                "I'll wait for their response",
                "Open Messages",
                "Change what I asked for",
            ];
        }

        return [
            "I'll wait for their response",
            "Open Messages",
            "Help me refine my type",
            "What should I improve?",
        ];
    }

    if (input.remainingSearches > 0) {
        return ["Find another", "Change what I asked for", "Skip feedback"];
    }

    return [
        "Change what I asked for",
        "Help me refine my type",
        "Save this for tomorrow",
    ];
}

export async function addMatchmakerConversationFeedback(input: {
    userId: string;
    outcome: MatchmakerFeedbackOutcome;
    reason?: string | null;
    candidateUserId?: string | null;
}) {
    const session = await getOrCreateRawSession(input.userId);
    const candidateUserId = input.candidateUserId ?? session.lastCandidateUserId ?? null;
    const memory = await recordMatchmakerFeedback({
        userId: input.userId,
        candidateUserId,
        outcome: input.outcome,
        reason: input.reason,
        metadata: {
            source: "matchmaker_conversation",
            sessionId: session.id,
        },
    });

    const wantsReason = input.outcome === "not_this_one" && !input.reason;
    const remainingSearches = Math.max(0, session.searchLimit - session.dailySearchCount);
    if (input.reason) {
        trackMatchmakerEvent({
            event: "feedback_reason_selected",
            userId: input.userId,
            sessionId: session.id,
            candidateUserId,
            metadata: {
                outcome: input.outcome,
                reason: input.reason,
                memorySummary: memory.memorySummary,
            },
        }).catch(() => undefined);
    }
    const recentMessages = await listMessages(session.id);
    const reply = await generateMatchmakerFeedbackReply({
        outcome: input.outcome,
        reason: input.reason,
        asksForReason: wantsReason,
        remainingSearches,
        memorySummary: memory.memorySummary,
        recentMessages: recentMessages.map((message) => ({
            role: message.role,
            text: message.text,
        })),
    });
    await createMessage({
        sessionId: session.id,
        role: "assistant",
        kind: "feedback",
        text: reply.text,
        quickReplies: buildFeedbackQuickReplies({
            outcome: input.outcome,
            wantsReason,
            remainingSearches,
        }),
        metadata: {
            outcome: input.outcome,
            reason: input.reason,
            candidateUserId,
            memorySummary: memory.memorySummary,
            provider: reply.provider,
            model: reply.model,
            fallbackUsed: reply.fallbackUsed,
        },
    });

    await db
        .update(matchmakerSessions)
        .set({
            state: "collecting_feedback",
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, session.id));

    return buildResponse(session.id);
}
