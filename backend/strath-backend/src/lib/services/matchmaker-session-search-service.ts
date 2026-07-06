import { eq, sql } from "drizzle-orm";

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
        await db
            .update(matchmakerSessions)
            .set({ state: "limit_reached", updatedAt: new Date() })
            .where(eq(matchmakerSessions.id, session.id));

        await createAssistantMessage({
            sessionId: session.id,
            kind: "limit",
            text: "I do not want to keep showing weaker matches today. I have saved what I learned, and tomorrow I can search again with that in mind.",
            quickReplies: [
                "Help me describe what I want",
                "Give me a date idea",
                "Improve my profile",
                "Save this for tomorrow",
            ],
            metadata: {
                limitReason: "daily_search_limit",
                used: session.dailySearchCount,
                limit: session.searchLimit,
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
        await createAssistantMessage({
            sessionId: session.id,
            kind: "text",
            text: "Tell me a little more about who would feel right today, then I can search properly.",
            quickReplies: ["Someone calm", "Someone serious", "Someone active today"],
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
        await db
            .update(matchmakerSessions)
            .set({ state: "ready_to_search", updatedAt: new Date() })
            .where(eq(matchmakerSessions.id, session.id));

        await createAssistantMessage({
            sessionId: session.id,
            kind: "text",
            text: "I could not find a strong new person from that direction yet. Change one thing and I can try again.",
            quickReplies: ["Broaden it", "More active today", "More serious"],
            metadata: {
                intentText,
                memorySummary: memory?.memorySummary,
                searchedCachedCandidates: result.meta.searchedCachedCandidates,
                excludedAlreadyShown: shownCandidateIds.length,
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

    await createAssistantMessage({
        sessionId: session.id,
        kind: "candidate",
        text: `I would start here. ${candidate.reason}`,
        quickReplies: SEARCH_QUICK_REPLIES,
        metadata: {
            candidate,
            position,
            intentText,
            memorySummary: memory?.memorySummary,
            source: "matchmaker",
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
