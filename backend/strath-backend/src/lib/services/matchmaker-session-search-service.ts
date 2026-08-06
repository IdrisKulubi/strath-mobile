import { and, asc, eq, lt, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    matchmakerMessages,
    matchmakerSessionResults,
    matchmakerSessions,
    matchmakerShortlists,
} from "@/db/schema";
import { isMatchmakerPersonalizationV2EnabledForUser } from "@/lib/feature-flags";
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
import { getMatchmakerBrief } from "@/lib/services/matchmaker-preference-service";

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

async function presentNextMatchmakerCandidateV1(session: MatchmakerSessionRow) {
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

const SHORTLIST_SIZE = 3;
const SHORTLIST_MINIMUM_INTERNAL_SCORE = 45;

export function buildMatchmakerShortlistRequestKey(input: {
    sessionId: string;
    dailySearchCount: number;
    briefVersion: number;
}) {
    return `matchmaker-v2:${input.sessionId}:${input.dailySearchCount}:${input.briefVersion}`;
}

export function curateUniqueShortlist<T extends { candidateUserId: string }>(
    candidates: T[],
    excludedCandidateIds: string[],
    limit = SHORTLIST_SIZE,
) {
    const excluded = new Set(excludedCandidateIds);
    const unique = new Map<string, T>();
    for (const candidate of candidates) {
        if (!unique.has(candidate.candidateUserId)) unique.set(candidate.candidateUserId, candidate);
    }
    return [...unique.values()]
        .filter((candidate) => !excluded.has(candidate.candidateUserId))
        .slice(0, Math.max(0, Math.min(limit, SHORTLIST_SIZE)));
}

async function presentCuratedMatchmakerShortlist(session: MatchmakerSessionRow) {
    if (session.state === "presenting_shortlist") return;
    if (session.dailySearchCount >= session.searchLimit) {
        return presentNextMatchmakerCandidateV1(session);
    }

    const [memory, shownCandidateIds, brief] = await Promise.all([
        getMatchmakerUserMemory(session.userId),
        listShownCandidateIds(session.id),
        getMatchmakerBrief(session.userId),
    ]);
    const memoryHint = buildMatchmakerMemoryHint(memory);
    const intentText = [buildSessionSearchText(session), memoryHint].filter(Boolean).join(". ");
    if (!intentText.trim()) return presentNextMatchmakerCandidateV1(session);

    trackMatchmakerEvent({
        event: "shortlist_requested",
        userId: session.userId,
        sessionId: session.id,
        metadata: { excludedCandidateCount: shownCandidateIds.length, briefVersion: brief.version },
    }).catch(() => undefined);

    let result: Awaited<ReturnType<typeof searchMatchmakerCandidates>>;
    try {
        result = await searchMatchmakerCandidates({
            viewerUserId: session.userId,
            intentText,
            limit: SHORTLIST_SIZE,
            minimumInternalScore: SHORTLIST_MINIMUM_INTERNAL_SCORE,
            excludeUserIds: shownCandidateIds,
            confirmedPreferences: brief.preferences
                .filter((preference) => preference.status === "active" && preference.certainty === "confirmed")
                .map((preference) => ({
                    id: preference.id,
                    value: preference.value,
                    sentiment: preference.sentiment,
                    importance: preference.importance,
                })),
        });
    } catch (error) {
        trackMatchmakerEvent({
            event: "shortlist_failed",
            userId: session.userId,
            sessionId: session.id,
            metadata: { excludedCandidateCount: shownCandidateIds.length },
        }).catch(() => undefined);
        throw error;
    }

    const uniqueCandidates = curateUniqueShortlist(result.candidates, shownCandidateIds);
    if (uniqueCandidates.length === 0) {
        const statusReply = await generateMatchmakerSearchStatusReply({
            status: "no_result",
            intentText,
            memorySummary: memory?.memorySummary,
            recentMessages: await listRecentMessages(session.id),
        });
        await db.update(matchmakerSessions).set({ state: "ready_to_search", updatedAt: new Date() }).where(eq(matchmakerSessions.id, session.id));
        await createAssistantMessage({
            sessionId: session.id,
            kind: "text",
            text: statusReply.text,
            quickReplies: ["Broaden it", "More active today", "More serious"],
            metadata: {
                intentText,
                searchedCachedCandidates: result.meta.searchedCachedCandidates,
                excludedAlreadyShown: shownCandidateIds.length,
                provider: statusReply.provider,
                model: statusReply.model,
                fallbackUsed: statusReply.fallbackUsed,
                shortlistEmpty: true,
            },
        });
        trackMatchmakerEvent({
            event: "shortlist_empty",
            userId: session.userId,
            sessionId: session.id,
            metadata: { excludedCandidateCount: shownCandidateIds.length, searchedCachedCandidates: result.meta.searchedCachedCandidates },
        }).catch(() => undefined);
        return;
    }

    const startingPosition = shownCandidateIds.length + 1;
    const requestKey = buildMatchmakerShortlistRequestKey({
        sessionId: session.id,
        dailySearchCount: session.dailySearchCount,
        briefVersion: brief.version,
    });
    const publicCandidates = uniqueCandidates.map((candidate, index) => {
        const { matchingEvidence, ...publicCandidate } = candidate;
        void matchingEvidence;
        const fitCopy = candidate.explanation.fitReasons.join(" ");
        return {
            ...publicCandidate,
            shortlistPosition: index + 1,
            reason: fitCopy || "This is a qualified profile, though some compatibility details are still unclear.",
        };
    });

    const persisted = await db.transaction(async (tx) => {
        const [created] = await tx.insert(matchmakerShortlists).values({
            sessionId: session.id,
            viewerUserId: session.userId,
            requestKey,
            briefVersion: brief.version,
            intentSnapshot: { intentText, sessionIntent: session.currentIntent, sessionPlan: session.currentPlan },
            metadata: {
                requestedSize: SHORTLIST_SIZE,
                resultSize: uniqueCandidates.length,
                searchedCachedCandidates: result.meta.searchedCachedCandidates,
                embeddingUsed: result.meta.embeddingUsed,
                excludedCandidateCount: shownCandidateIds.length,
            },
        }).onConflictDoNothing({ target: matchmakerShortlists.requestKey }).returning();
        if (!created) return { created: false as const, shortlistId: null };

        await tx.insert(matchmakerSessionResults).values(uniqueCandidates.map((candidate, index) => ({
            shortlistId: created.id,
            sessionId: session.id,
            viewerUserId: session.userId,
            candidateUserId: candidate.candidateUserId,
            position: startingPosition + index,
            reason: publicCandidates[index].reason,
            labels: candidate.labels,
            fitReasons: candidate.explanation.fitReasons,
            matchedPreferenceIds: candidate.explanation.matchedPreferenceIds,
            reciprocalFitEvidence: candidate.explanation.reciprocalFitEvidence,
            tradeoff: candidate.explanation.tradeoff,
            unknown: candidate.explanation.unknown,
            matchingEvidence: candidate.matchingEvidence,
            intentSnapshot: { intentText, sessionIntent: session.currentIntent, sessionPlan: session.currentPlan, briefVersion: brief.version },
            metadata: { source: "matchmaker_shortlist_v2", rankingReason: candidate.reason },
        })));

        const updated = await tx.update(matchmakerSessions).set({
            state: "presenting_shortlist",
            dailySearchCount: sql`${matchmakerSessions.dailySearchCount} + 1`,
            lastCandidateUserId: uniqueCandidates[0].candidateUserId,
            metadata: sql`${matchmakerSessions.metadata} || ${JSON.stringify({ lastShortlistId: created.id })}::jsonb`,
            updatedAt: new Date(),
        }).where(and(
            eq(matchmakerSessions.id, session.id),
            eq(matchmakerSessions.dailySearchCount, session.dailySearchCount),
            lt(matchmakerSessions.dailySearchCount, matchmakerSessions.searchLimit),
        )).returning({ id: matchmakerSessions.id });
        if (updated.length !== 1) throw new Error("Matchmaker search quota changed while creating the shortlist");

        const messageText = `I found ${publicCandidates.length} ${publicCandidates.length === 1 ? "person" : "people"} worth considering.`;
        await tx.insert(matchmakerMessages).values({
            sessionId: session.id,
            role: "assistant",
            kind: "candidate",
            text: messageText,
            quickReplies: SEARCH_QUICK_REPLIES,
            metadata: {
                shortlist: {
                    id: created.id,
                    briefVersion: brief.version,
                    candidates: publicCandidates,
                },
                candidate: publicCandidates[0],
                source: "matchmaker_shortlist_v2",
                intentText,
            },
        });
        await tx.update(matchmakerShortlists).set({ status: "presented", creditConsumed: true, updatedAt: new Date() }).where(eq(matchmakerShortlists.id, created.id));
        return { created: true as const, shortlistId: created.id };
    });

    if (!persisted.created) return;
    const shortlistEvent = uniqueCandidates.length < SHORTLIST_SIZE ? "shortlist_partial" : "shortlist_generated";
    trackMatchmakerEvent({
        event: shortlistEvent,
        userId: session.userId,
        sessionId: session.id,
        metadata: {
            shortlistId: persisted.shortlistId,
            shortlistSize: uniqueCandidates.length,
            excludedCandidateCount: shownCandidateIds.length,
            evidenceCandidateCount: uniqueCandidates.filter((candidate) => candidate.explanation.fitReasons.length > 0).length,
            providerFallback: !result.meta.embeddingUsed,
        },
    }).catch(() => undefined);
    trackMatchmakerEvent({
        event: "shortlist_credit_consumed",
        userId: session.userId,
        sessionId: session.id,
        metadata: { shortlistId: persisted.shortlistId, shortlistSize: uniqueCandidates.length },
    }).catch(() => undefined);
    uniqueCandidates.forEach((candidate, index) => {
        trackMatchmakerEvent({
            event: "candidate_shown",
            userId: session.userId,
            sessionId: session.id,
            candidateUserId: candidate.candidateUserId,
            metadata: { shortlistId: persisted.shortlistId, shortlistPosition: index + 1, shortlistSize: uniqueCandidates.length },
        }).catch(() => undefined);
    });
}

export async function presentNextMatchmakerCandidate(session: MatchmakerSessionRow) {
    const personalizationV2 = await isMatchmakerPersonalizationV2EnabledForUser(session.userId);
    return personalizationV2
        ? presentCuratedMatchmakerShortlist(session)
        : presentNextMatchmakerCandidateV1(session);
}
