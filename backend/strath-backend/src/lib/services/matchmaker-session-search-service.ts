import { asc, eq, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    matchmakerMessages,
    matchmakerSessionResults,
    matchmakerSessions,
} from "@/db/schema";
import {
    buildMatchmakerMemoryHint,
    getMatchmakerUserMemory,
} from "@/lib/services/matchmaker-memory-service";
import {
    generateMatchmakerCandidateIntro,
    generateMatchmakerLimitReply,
    generateMatchmakerSearchStatusReply,
} from "@/lib/services/matchmaker-llm-client";
import { trackMatchmakerEvent } from "@/lib/services/matchmaker-analytics-service";
import { searchMatchmakerCandidates } from "@/lib/services/matchmaker-search-service";

type MatchmakerSessionRow = typeof matchmakerSessions.$inferSelect;

const SEARCH_QUICK_REPLIES = [
    "Not this one",
    "Find another",
    "Why them?",
    "Change what I asked for",
];

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

function buildSessionSearchText(session: MatchmakerSessionRow) {
    const currentPlan = readRecord(session.currentPlan);
    const currentIntent = readRecord(session.currentIntent);
    const planIntent = readRecord(currentPlan.intent);
    const lastUserMessage = typeof currentIntent.lastUserMessage === "string"
        ? currentIntent.lastUserMessage
        : "";
    const rawText = typeof planIntent.rawText === "string" ? planIntent.rawText : "";
    const traits = asStringArray(planIntent.traits);
    const priorities = asStringArray(currentPlan.priorities);
    const relationshipIntent = typeof planIntent.relationshipIntent === "string"
        ? planIntent.relationshipIntent
        : "";
    const activityRequirement = typeof planIntent.activityRequirement === "string"
        ? planIntent.activityRequirement
        : "";
    const socialEnergy = typeof planIntent.socialEnergy === "string"
        ? planIntent.socialEnergy
        : "";

    return [
        lastUserMessage,
        rawText,
        traits.length > 0 ? `Traits: ${traits.join(", ")}` : "",
        priorities.length > 0 ? `Priorities: ${priorities.join(", ")}` : "",
        relationshipIntent ? `Relationship intent: ${relationshipIntent}` : "",
        activityRequirement ? `Activity: ${activityRequirement}` : "",
        socialEnergy ? `Social energy: ${socialEnergy}` : "",
    ].filter(Boolean).join(". ");
}

async function listShownCandidateIds(sessionId: string) {
    const rows = await db
        .select({ candidateUserId: matchmakerSessionResults.candidateUserId })
        .from(matchmakerSessionResults)
        .where(eq(matchmakerSessionResults.sessionId, sessionId));

    return rows.map((row) => row.candidateUserId);
}

async function getNextPosition(sessionId: string) {
    const rows = await db
        .select({ id: matchmakerSessionResults.id })
        .from(matchmakerSessionResults)
        .where(eq(matchmakerSessionResults.sessionId, sessionId));

    return rows.length + 1;
}

async function listRecentMessages(sessionId: string) {
    const rows = await db.query.matchmakerMessages.findMany({
        where: eq(matchmakerMessages.sessionId, sessionId),
        orderBy: [asc(matchmakerMessages.createdAt)],
    });
    return rows.slice(-8).map((message) => ({
        role: message.role,
        text: message.text,
    }));
}

async function createAssistantMessage(input: {
    sessionId: string;
    kind: "candidate" | "limit" | "text";
    text: string;
    quickReplies?: string[];
    metadata?: Record<string, unknown>;
}) {
    await db.insert(matchmakerMessages).values({
        sessionId: input.sessionId,
        role: "assistant",
        kind: input.kind,
        text: input.text,
        quickReplies: input.quickReplies ?? [],
        metadata: input.metadata ?? {},
    });
}

export async function presentNextMatchmakerCandidate(session: MatchmakerSessionRow) {
    if (session.dailySearchCount >= session.searchLimit) {
        const [memory, recentMessages] = await Promise.all([
            getMatchmakerUserMemory(session.userId),
            listRecentMessages(session.id),
        ]);
        const limitReply = await generateMatchmakerLimitReply({
            used: session.dailySearchCount,
            limit: session.searchLimit,
            memorySummary: memory?.memorySummary,
            recentMessages,
        });
        await db
            .update(matchmakerSessions)
            .set({ state: "limit_reached", updatedAt: new Date() })
            .where(eq(matchmakerSessions.id, session.id));

        await createAssistantMessage({
            sessionId: session.id,
            kind: "limit",
            text: limitReply.text,
            quickReplies: [
                "Help me refine my type",
                "What should I improve?",
                "Give me a date idea",
            ],
            metadata: {
                limitReason: "daily_search_limit",
                used: session.dailySearchCount,
                limit: session.searchLimit,
                limitMode: "idle",
                limitAction: "entry",
                provider: limitReply.provider,
                model: limitReply.model,
                fallbackUsed: limitReply.fallbackUsed,
            },
        });
        trackMatchmakerEvent({
            event: "quota_reached",
            userId: session.userId,
            sessionId: session.id,
            metadata: {
                used: session.dailySearchCount,
                limit: session.searchLimit,
            },
        }).catch(() => undefined);
        return;
    }

    const [memory, shownCandidateIds] = await Promise.all([
        getMatchmakerUserMemory(session.userId),
        listShownCandidateIds(session.id),
    ]);
    const memoryHint = buildMatchmakerMemoryHint(memory);
    const intentText = [
        buildSessionSearchText(session),
        memoryHint,
    ].filter(Boolean).join(". ");
    if (!intentText.trim()) {
        const statusReply = await generateMatchmakerSearchStatusReply({
            status: "needs_intent",
            memorySummary: memory?.memorySummary,
            recentMessages: await listRecentMessages(session.id),
        });
        await createAssistantMessage({
            sessionId: session.id,
            kind: "text",
            text: statusReply.text,
            quickReplies: ["Someone calm", "Someone serious", "Someone active today"],
            metadata: {
                provider: statusReply.provider,
                model: statusReply.model,
                fallbackUsed: statusReply.fallbackUsed,
            },
        });
        return;
    }

    const result = await searchMatchmakerCandidates({
        viewerUserId: session.userId,
        intentText,
        limit: 1,
        excludeUserIds: shownCandidateIds,
    });
    const candidate = result.candidates[0];

    if (!candidate) {
        const statusReply = await generateMatchmakerSearchStatusReply({
            status: "no_result",
            intentText,
            memorySummary: memory?.memorySummary,
            recentMessages: await listRecentMessages(session.id),
        });
        await db
            .update(matchmakerSessions)
            .set({ state: "ready_to_search", updatedAt: new Date() })
            .where(eq(matchmakerSessions.id, session.id));

        await createAssistantMessage({
            sessionId: session.id,
            kind: "text",
            text: statusReply.text,
            quickReplies: ["Broaden it", "More active today", "More serious"],
            metadata: {
                intentText,
                memorySummary: memory?.memorySummary,
                searchedCachedCandidates: result.meta.searchedCachedCandidates,
                excludedAlreadyShown: shownCandidateIds.length,
                provider: statusReply.provider,
                model: statusReply.model,
                fallbackUsed: statusReply.fallbackUsed,
            },
        });
        return;
    }

    const position = await getNextPosition(session.id);
    await db.insert(matchmakerSessionResults).values({
        sessionId: session.id,
        viewerUserId: session.userId,
        candidateUserId: candidate.candidateUserId,
        position,
        reason: candidate.reason,
        labels: candidate.labels,
        intentSnapshot: {
            intentText,
            sessionIntent: session.currentIntent,
            sessionPlan: session.currentPlan,
        },
        metadata: {
            source: "matchmaker_session_search",
            searchedCachedCandidates: result.meta.searchedCachedCandidates,
            embeddingUsed: result.meta.embeddingUsed,
        },
    });

    await db
        .update(matchmakerSessions)
        .set({
            state: "presenting_candidate",
            dailySearchCount: sql`${matchmakerSessions.dailySearchCount} + 1`,
            lastCandidateUserId: candidate.candidateUserId,
            updatedAt: new Date(),
        })
        .where(eq(matchmakerSessions.id, session.id));

    const recentMessages = await listRecentMessages(session.id);
    const candidateIntro = await generateMatchmakerCandidateIntro({
        firstName: candidate.firstName,
        age: candidate.age,
        university: candidate.university,
        course: candidate.course,
        labels: candidate.labels,
        matchReason: candidate.reason,
        intentText,
        memorySummary: memory?.memorySummary,
        recentMessages,
    });
    const presentedCandidate = {
        ...candidate,
        reason: candidateIntro.text,
    };
    await createAssistantMessage({
        sessionId: session.id,
        kind: "candidate",
        text: candidateIntro.text,
        quickReplies: SEARCH_QUICK_REPLIES,
        metadata: {
            candidate: presentedCandidate,
            matchingReason: candidate.reason,
            position,
            intentText,
            memorySummary: memory?.memorySummary,
            source: "matchmaker",
            provider: candidateIntro.provider,
            model: candidateIntro.model,
            fallbackUsed: candidateIntro.fallbackUsed,
        },
    });
    trackMatchmakerEvent({
        event: "candidate_shown",
        userId: session.userId,
        sessionId: session.id,
        candidateUserId: candidate.candidateUserId,
        metadata: {
            position,
            labels: candidate.labels,
            searchedCachedCandidates: result.meta.searchedCachedCandidates,
            embeddingUsed: result.meta.embeddingUsed,
            memoryUsed: Boolean(memory?.memorySummary),
        },
    }).catch(() => undefined);
}
