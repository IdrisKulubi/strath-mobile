import { and, asc, desc, eq, inArray } from "drizzle-orm";

import db from "@/db/drizzle";
import { blocks, matchmakerMessages, matchmakerSessionResults, matchmakerSessions, matchmakerShortlists, profiles, userMatchInterests } from "@/db/schema";
import { hasCompletedInitialFaceVerification } from "@/lib/matchmaking-pool-eligibility";
import { applyShortlistAvailability, removeShortlistCandidates, shortlistCandidateIds } from "@/lib/matchmaker/shortlist-availability";
import {
    buildMatchmakerFeedbackProposal,
    hasRecordedFeedbackSubmission,
    type MatchmakerFeedbackReasonCode,
} from "@/lib/matchmaker/feedback-domain";
import type { MatchmakerFeedbackLearningScope } from "@/lib/matchmaker/preference-domain";
import {
    answerAddressesActiveQuestion,
    generateMatchmakerFeedbackReply,
    generateMatchmakerGreeting,
    generateMatchmakerDateIdeaReply,
    generateMatchmakerLimitReply,
    generateMatchmakerLlmTurn,
    generateMatchmakerProfileTipsReply,
    generateMatchmakerRefinePromptReply,
    generateMatchmakerRefineSavedReply,
    isMatchmakerSearchConfirmation,
    resolveMatchmakerClarifyingQuickReplies,
    type MatchmakerActiveQuestion,
} from "@/lib/services/matchmaker-llm-client";
import { isMatchmakerPersonalizationV2EnabledForUser } from "@/lib/feature-flags";
import {
    getMatchmakerUserMemory,
    recordMatchmakerFeedback,
    type MatchmakerFeedbackOutcome,
} from "@/lib/services/matchmaker-memory-service";
import { getPhotoImprovementTips } from "@/lib/services/photo-intelligence-service";
import { trackMatchmakerEvent } from "@/lib/services/matchmaker-analytics-service";
import { ensurePermanentCandidatePass } from "@/lib/services/match-intelligence-service";
import { presentNextMatchmakerCandidate } from "@/lib/services/matchmaker-session-search-service";
import {
    applyMatchmakerPreferenceProposals,
    buildMatchmakerBriefSearchPlan,
    buildMatchmakerBriefSummary,
    buildMatchmakerSearchConfirmation,
    findMatchmakerBriefContradictions,
    getMatchmakerBrief,
    mutateMatchmakerBrief,
    resolveMatchmakerBriefContradiction,
} from "@/lib/services/matchmaker-preference-service";

export type MatchmakerConversationState =
    | "greeting"
    | "collecting_intent"
    | "clarifying"
    | "ready_to_search"
    | "presenting_candidate"
    | "presenting_shortlist"
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
            learningScope: "future_matches",
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

function readActiveQuestion(row: typeof matchmakerSessions.$inferSelect): MatchmakerActiveQuestion | null {
    const value = readSessionMetadata(row).activeQuestion;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const record = value as Record<string, unknown>;
    if (typeof record.key !== "string" || typeof record.category !== "string" || typeof record.question !== "string") return null;
    return record as unknown as MatchmakerActiveQuestion;
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

    const storedMessages = await listMessages(session.id);
    const candidateIds = shortlistCandidateIds(storedMessages);
    let messages = storedMessages;
    if (candidateIds.length > 0) {
        const [candidateProfiles, blockedByViewer, blockedViewer, passedByViewer] = await Promise.all([
            db.query.profiles.findMany({ where: inArray(profiles.userId, candidateIds) }),
            db.select({ id: blocks.blockedId }).from(blocks).where(and(eq(blocks.blockerId, session.userId), inArray(blocks.blockedId, candidateIds))),
            db.select({ id: blocks.blockerId }).from(blocks).where(and(eq(blocks.blockedId, session.userId), inArray(blocks.blockerId, candidateIds))),
            db.select({ id: userMatchInterests.candidateUserId }).from(userMatchInterests).where(and(
                eq(userMatchInterests.viewerUserId, session.userId),
                eq(userMatchInterests.decision, "passed"),
                inArray(userMatchInterests.candidateUserId, candidateIds),
            )),
        ]);
        const passedIds = new Set(passedByViewer.map((row) => row.id));
        messages = removeShortlistCandidates(messages, passedIds);
        const eligibleIds = new Set(candidateProfiles.filter((profile) =>
            (profile.profileCompleted || profile.isComplete)
            && profile.isVisible !== false
            && profile.discoveryPaused !== true
            && hasCompletedInitialFaceVerification(profile),
        ).map((profile) => profile.userId));
        const blockedIds = new Set([...blockedByViewer, ...blockedViewer].map((row) => row.id));
        const unavailableIds = new Set(candidateIds.filter((id) => !passedIds.has(id) && (!eligibleIds.has(id) || blockedIds.has(id))));
        if (unavailableIds.size > 0) {
            const availability = applyShortlistAvailability(messages, unavailableIds);
            messages = availability.messages;
            const staleShortlistIds = availability.staleShortlistIds;
            if (staleShortlistIds.length > 0) {
                await db.update(matchmakerShortlists).set({ status: "stale", updatedAt: new Date() }).where(inArray(matchmakerShortlists.id, staleShortlistIds));
            }
        }
    }
    const latestAssistant = [...messages].reverse().find((message) => message.role === "assistant");
    const activeQuestion = latestAssistant?.metadata.activeQuestion;
    const activeQuestionCategory = activeQuestion && typeof activeQuestion === "object" && !Array.isArray(activeQuestion)
        ? String((activeQuestion as Record<string, unknown>).category ?? "")
        : null;
    const quickReplies = latestAssistant?.kind === "clarifying_question"
        ? resolveMatchmakerClarifyingQuickReplies({
            question: latestAssistant.text,
            category: activeQuestionCategory,
            suggestedReplies: latestAssistant.quickReplies,
        })
        : latestAssistant?.quickReplies ?? [];

    return {
        session: serializeSession(session),
        messages,
        quickReplies,
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

    const personalizationV2 = await isMatchmakerPersonalizationV2EnabledForUser(input.userId);
    const [memory, loadedBrief] = await Promise.all([
        getMatchmakerUserMemory(input.userId),
        personalizationV2 ? getMatchmakerBrief(input.userId) : Promise.resolve(null),
    ]);
    const activeQuestionAtTurnStart = personalizationV2 ? readActiveQuestion(session) : null;
    let activeQuestion = activeQuestionAtTurnStart;
    let briefBeforeTurn = loadedBrief;
    const contradictionChoice = /\bi want this\b/i.test(cleaned)
        ? "prefer" as const
        : /\bavoid this\b/i.test(cleaned)
            ? "avoid" as const
            : /\bkeep it flexible\b/i.test(cleaned)
                ? "flexible" as const
                : null;
    const resolvedContradiction = Boolean(
        personalizationV2 && activeQuestion?.context?.type === "contradiction" && contradictionChoice,
    );
    if (resolvedContradiction && activeQuestion?.context && contradictionChoice) {
        briefBeforeTurn = await resolveMatchmakerBriefContradiction({
            userId: input.userId,
            preferPreferenceId: activeQuestion.context.preferPreferenceId,
            avoidPreferenceId: activeQuestion.context.avoidPreferenceId,
            choice: contradictionChoice,
        });
        activeQuestion = null;
    }
    const structuredBriefSummary = briefBeforeTurn ? buildMatchmakerBriefSummary(briefBeforeTurn) : null;
    const memorySummary = [memory?.memorySummary, structuredBriefSummary].filter(Boolean).join(". ") || null;
    const llmTurn = await generateMatchmakerLlmTurn({
        userMessage: cleaned,
        state: session.state,
        currentIntent: session.currentIntent ?? {},
        memorySummary,
        activeQuestion,
        recentMessages: existingMessages.map((message) => ({
            role: message.role,
            text: message.text,
        })),
    });

    let nextActiveQuestion: MatchmakerActiveQuestion | null = null;
    let persistedBrief = briefBeforeTurn;
    let shouldClarify = llmTurn.shouldClarify;
    let assistantReply = llmTurn.reply;
    let assistantQuickReplies = llmTurn.quickReplies;
    if (personalizationV2) {
        const briefAfterTurn = await applyMatchmakerPreferenceProposals({
            userId: input.userId,
            sessionId: session.id,
            proposals: resolvedContradiction ? [] : llmTurn.preferenceProposals ?? [],
        });
        persistedBrief = briefAfterTurn;
        const contradiction = findMatchmakerBriefContradictions(briefAfterTurn)[0];
        if (contradiction) {
            shouldClarify = true;
            assistantReply = `I have “${contradiction.value}” both as something you want and something to avoid. Which one should guide future matches?`;
            assistantQuickReplies = ["I want this", "Avoid this", "Keep it flexible"];
            nextActiveQuestion = {
                key: `contradiction:${contradiction.category}:${contradiction.value.toLowerCase()}`,
                category: contradiction.category as MatchmakerActiveQuestion["category"],
                question: assistantReply,
                context: {
                    type: "contradiction",
                    preferPreferenceId: briefAfterTurn.preferences.find((preference) => contradiction.preferenceIds.includes(preference.id) && preference.sentiment === "prefer")!.id,
                    avoidPreferenceId: briefAfterTurn.preferences.find((preference) => contradiction.preferenceIds.includes(preference.id) && preference.sentiment === "avoid")!.id,
                },
            };
        } else if (resolvedContradiction) {
            shouldClarify = false;
            assistantReply = buildMatchmakerSearchConfirmation(briefAfterTurn);
            assistantQuickReplies = ["Go ahead and search", "Change something"];
        } else if (llmTurn.shouldClarify) {
            const answeredPrevious = answerAddressesActiveQuestion({
                userMessage: cleaned,
                state: session.state,
                activeQuestion,
            }, llmTurn);
            nextActiveQuestion = !answeredPrevious && activeQuestion
                ? activeQuestion
                : llmTurn.unresolvedQuestion ?? {
                    key: `question:${llmTurn.intent.socialEnergy ?? "other"}`,
                    category: llmTurn.intent.socialEnergy && llmTurn.intent.socialEnergy !== "unknown" ? "social_energy" : "other",
                    question: llmTurn.clarifyingQuestion ?? llmTurn.reply,
                };
            assistantQuickReplies = resolveMatchmakerClarifyingQuickReplies({
                question: assistantReply,
                category: nextActiveQuestion.category,
                suggestedReplies: llmTurn.quickReplies,
            });
        } else {
            assistantReply = buildMatchmakerSearchConfirmation(briefAfterTurn);
            assistantQuickReplies = ["Go ahead and search", "Change something"];
        }
    }

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
    const nextState: MatchmakerConversationState = shouldClarify
        ? "clarifying"
        : "ready_to_search";
    const currentIntent = {
        ...llmTurn.intent,
        lastUserMessage: cleaned,
        provider: llmTurn.provider,
        model: llmTurn.model,
    };
    const persistedPlan = persistedBrief ? buildMatchmakerBriefSearchPlan(persistedBrief) : null;
    const plan = personalizationV2 && persistedPlan
        ? { ...persistedPlan, intent: llmTurn.intent, briefVersion: persistedBrief?.version ?? 0 }
        : { ...llmTurn.searchPlan, intent: llmTurn.intent };

    await db
        .update(matchmakerSessions)
        .set({
            state: nextState,
            currentIntent,
            currentPlan: plan,
            metadata: {
                ...readSessionMetadata(session),
                activeQuestion: nextActiveQuestion,
                briefVersion: persistedBrief?.version ?? null,
            },
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, session.id));

    await createMessage({
        sessionId: session.id,
        role: "assistant",
        kind: shouldClarify ? "clarifying_question" : "search_plan",
        text: assistantReply,
        quickReplies: assistantQuickReplies,
        metadata: {
            intent: currentIntent,
            plan,
            provider: llmTurn.provider,
            model: llmTurn.model,
            fallbackUsed: llmTurn.fallbackUsed,
            messageType: llmTurn.messageType,
            activeQuestion: nextActiveQuestion,
            preferenceProposalCount: llmTurn.preferenceProposals?.length ?? 0,
        },
    });
    trackMatchmakerEvent({
        event: shouldClarify ? "clarification_asked" : "search_plan_confirmed",
        userId: input.userId,
        sessionId: session.id,
        metadata: {
            provider: llmTurn.provider,
            model: llmTurn.model,
            fallbackUsed: llmTurn.fallbackUsed,
            messageType: llmTurn.messageType,
            quickReplyCount: assistantQuickReplies.length,
            briefVersion: persistedBrief?.version,
        },
    }).catch(() => undefined);
    if (personalizationV2 && activeQuestionAtTurnStart && !nextActiveQuestion) {
        trackMatchmakerEvent({
            event: "clarification_resolved",
            userId: input.userId,
            sessionId: session.id,
            metadata: { questionKey: activeQuestionAtTurnStart.key, category: activeQuestionAtTurnStart.category },
        }).catch(() => undefined);
    }

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
    shortlistId?: string | null;
    reasonCode?: MatchmakerFeedbackReasonCode | null;
    detail?: string | null;
    learningScope?: MatchmakerFeedbackLearningScope;
    confirmLearning?: boolean;
    baseVersion?: number;
    submissionId?: string | null;
}) {
    const session = await getOrCreateRawSession(input.userId);
    const candidateUserId = input.candidateUserId ?? session.lastCandidateUserId ?? null;
    const learningScope = input.learningScope ?? "candidate_only";

    if (input.shortlistId && candidateUserId) {
        const shortlistCandidate = await db.query.matchmakerSessionResults.findFirst({
            where: and(
                eq(matchmakerSessionResults.shortlistId, input.shortlistId),
                eq(matchmakerSessionResults.viewerUserId, input.userId),
                eq(matchmakerSessionResults.candidateUserId, candidateUserId),
            ),
            columns: { id: true },
        });
        if (!shortlistCandidate) throw new Error("This candidate is not part of your shortlist");
    }

    if (candidateUserId && (input.outcome === "not_this_one" || input.outcome === "passed")) {
        await ensurePermanentCandidatePass({
            viewerUserId: input.userId,
            candidateUserId,
            source: "matchmaker",
        });
    }

    if (input.submissionId) {
        const existingMemory = await getMatchmakerUserMemory(input.userId);
        const alreadyRecorded = hasRecordedFeedbackSubmission(existingMemory?.feedbackHistory, input.submissionId);
        if (alreadyRecorded) return buildResponse(session.id);
    }

    const proposal = input.reasonCode
        ? buildMatchmakerFeedbackProposal({ reasonCode: input.reasonCode, detail: input.detail })
        : null;
    if (learningScope === "future_matches") {
        const personalizationV2 = await isMatchmakerPersonalizationV2EnabledForUser(input.userId);
        if (!personalizationV2) throw new Error("Future-match learning is not available yet");
        if (!input.reasonCode) throw new Error("A feedback reason is required for future learning");
        if (!proposal) throw new Error("Add one specific detail before updating future matches");
        if (!input.confirmLearning || input.baseVersion === undefined) {
            throw new Error("Preview and confirm the latest match brief before saving future learning");
        }
    }

    const updatedBrief = proposal && learningScope === "future_matches"
        ? await mutateMatchmakerBrief({
            userId: input.userId,
            baseVersion: input.baseVersion!,
            operations: [proposal.operation],
            metadata: {
                source: "confirmed_matchmaker_feedback",
                reasonCode: input.reasonCode,
                shortlistId: input.shortlistId ?? undefined,
                candidateUserId: candidateUserId ?? undefined,
            },
            requestKey: input.submissionId ? `feedback:${input.submissionId}` : undefined,
        })
        : null;
    const memory = await recordMatchmakerFeedback({
        userId: input.userId,
        candidateUserId,
        outcome: input.outcome,
        reason: input.detail ?? input.reason,
        reasonCode: input.reasonCode,
        shortlistId: input.shortlistId,
        submissionId: input.submissionId,
        learningScope,
        syncPreferences: !updatedBrief,
        metadata: {
            source: "matchmaker_conversation",
            sessionId: session.id,
        },
    });

    if (input.reasonCode) {
        const event = learningScope === "future_matches" ? "feedback_learning_confirmed" : "feedback_candidate_only";
        trackMatchmakerEvent({
            event,
            userId: input.userId,
            sessionId: session.id,
            candidateUserId,
            metadata: {
                reasonCode: input.reasonCode,
                shortlistId: input.shortlistId ?? null,
            },
        }).catch(() => undefined);
    }

    const wantsReason = input.outcome === "not_this_one" && !input.reason && !input.reasonCode;
    const remainingSearches = Math.max(0, session.searchLimit - session.dailySearchCount);
    if (input.reason || input.reasonCode) {
        trackMatchmakerEvent({
            event: "feedback_reason_selected",
            userId: input.userId,
            sessionId: session.id,
            candidateUserId,
            metadata: {
                outcome: input.outcome,
                reasonCode: input.reasonCode ?? "legacy_reason",
            },
        }).catch(() => undefined);
    }
    const recentMessages = await listMessages(session.id);
    const reply = input.reasonCode ? {
        text: updatedBrief && proposal
            ? `Saved. I will use "${proposal.summary}" for future matches. You can undo this change.`
            : "Thanks. I will keep that feedback about this person only. Your match brief has not changed.",
        provider: "system" as const,
        model: null,
        fallbackUsed: false,
    } : await generateMatchmakerFeedbackReply({
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
            reason: input.reasonCode ? undefined : input.reason,
            reasonCode: input.reasonCode,
            shortlistId: input.shortlistId,
            learningScope,
            candidateUserId,
            ...(updatedBrief && proposal ? {
                learningUpdate: {
                    summary: proposal.summary,
                    briefVersion: updatedBrief.version,
                    changeId: updatedBrief.latestChangeId,
                    canUndo: Boolean(updatedBrief.latestChangeId),
                },
            } : {}),
            ...(!input.reasonCode ? { memorySummary: memory.memorySummary } : {}),
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
