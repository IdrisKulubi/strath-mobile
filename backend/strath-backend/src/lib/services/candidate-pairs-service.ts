import { and, asc, desc, eq, gt, gte, inArray, isNotNull, lt, lte, ne, notInArray, or, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    blocks,
    candidatePairHistory,
    candidatePairs,
    matches,
    mutualMatches,
    profiles,
    user,
} from "@/db/schema";
import {
    collectUsersIPassedIds,
    compareScoredCandidatesForFairness,
    computeEffectiveMinScore,
    shouldSkipCandidateForExistingDyad,
    type FairnessRelaxConfig,
} from "@/lib/matching/candidate-pool-policy";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { getTargetGenders, isReciprocalGenderMatch } from "@/lib/gender-preferences";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export const DAILY_CANDIDATE_PAIR_LIMIT = 1;
export const ACTIVE_EXPOSURE_CAP = 2;

// Expiry: env CANDIDATE_PAIR_EXPIRY_MINUTES (default 1440 = 24h). Use 5 for testing.
const EXPIRY_MINUTES = Number(process.env.CANDIDATE_PAIR_EXPIRY_MINUTES) || 1440;
export const CANDIDATE_PAIR_EXPIRY_HOURS = EXPIRY_MINUTES / 60;
// Cooldown: when expiry < 1h (testing), use 1-min cooldown. Otherwise 7 days.
export const EXPIRED_PAIR_COOLDOWN_DAYS = CANDIDATE_PAIR_EXPIRY_HOURS < 1 ? 1 / (24 * 60) : 7;

/** Minimum compatibility (0–100) required before creating a candidate pair or queue slot. */
export const MIN_CANDIDATE_MATCH_SCORE = Number(process.env.MIN_CANDIDATE_MATCH_SCORE) || 58;
/** Never relax effective minimum below this (0–100). */
const MIN_CANDIDATE_MATCH_SCORE_FLOOR = Number(process.env.MIN_CANDIDATE_MATCH_SCORE_FLOOR) || 50;
/** Max curated introductions per batch: one goes live immediately, the rest queue for later UTC days. */
export const MAX_CANDIDATE_QUEUE_SIZE = Number(process.env.MAX_CANDIDATE_QUEUE_SIZE) || 5;

function getFairnessRelaxConfig(): FairnessRelaxConfig {
    const maxRelax = Number(process.env.MATCH_MAX_SCORE_RELAX_STEPS) || 4;
    const sparseExtra = Number(process.env.MATCH_SPARSE_EXTRA_RELAX_STEPS) || 1;
    return {
        waitDaysBeforeRelax: Number(process.env.MATCH_WAIT_DAYS_BEFORE_RELAX) || 3,
        scoreRelaxPerStep: Number(process.env.MATCH_SCORE_RELAX_PER_STEP) || 2,
        maxRelaxSteps: maxRelax,
        sparsePoolThreshold: Number(process.env.MATCH_SPARSE_POOL_THRESHOLD) || 8,
        sparseExtraRelaxSteps: sparseExtra,
        maxTotalRelaxSteps: Number(process.env.MATCH_MAX_TOTAL_RELAX_STEPS) || maxRelax + sparseExtra + 1,
    };
}

export type CandidateDecision = "pending" | "open_to_meet" | "passed";
export type CandidatePairStatus = "active" | "queued" | "mutual" | "closed" | "expired";
export type MutualMatchStatus =
    | "mutual"
    | "call_pending"
    | "being_arranged"
    | "upcoming"
    | "completed"
    | "cancelled"
    | "expired";

type CandidatePairRow = typeof candidatePairs.$inferSelect;
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function canonicalizePairUsers(firstUserId: string, secondUserId: string) {
    return firstUserId < secondUserId
        ? { userAId: firstUserId, userBId: secondUserId }
        : { userAId: secondUserId, userBId: firstUserId };
}

export function getPairRole(pair: Pick<CandidatePairRow, "userAId" | "userBId">, userId: string) {
    if (pair.userAId === userId) return "a";
    if (pair.userBId === userId) return "b";
    return null;
}

export function getCurrentUserDecision(pair: Pick<CandidatePairRow, "userAId" | "userBId" | "aDecision" | "bDecision">, userId: string): CandidateDecision {
    return pair.userAId === userId ? pair.aDecision : pair.bDecision;
}

export function getOtherUserId(pair: Pick<CandidatePairRow, "userAId" | "userBId">, userId: string) {
    return pair.userAId === userId ? pair.userBId : pair.userAId;
}

export function resolveCandidatePairStatus(
    aDecision: CandidateDecision,
    bDecision: CandidateDecision,
): CandidatePairStatus {
    if (aDecision === "passed" || bDecision === "passed") {
        return "closed";
    }

    if (aDecision === "open_to_meet" && bDecision === "open_to_meet") {
        return "mutual";
    }

    return "active";
}

export async function recordCandidatePairHistory(
    tx: TransactionClient,
    input: {
        pairId: string;
        actorUserId?: string | null;
        eventType:
            | "generated"
            | "promoted"
            | "responded"
            | "mutual"
            | "closed"
            | "expired"
            | "bridged_to_match"
            | "bridged_to_date";
        fromStatus?: CandidatePairStatus;
        toStatus?: CandidatePairStatus;
        metadata?: Record<string, unknown>;
    },
) {
    await tx.insert(candidatePairHistory).values({
        pairId: input.pairId,
        actorUserId: input.actorUserId ?? null,
        eventType: input.eventType,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        metadata: input.metadata ?? {},
    });
}

export async function expireCandidatePairs(now = new Date()) {
    const expiryMs = CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000;
    const createdAtCutoff = new Date(now.getTime() - expiryMs);

    const expired = await db.transaction(async (tx) => {
        const toExpire = await tx
            .select({ id: candidatePairs.id, userAId: candidatePairs.userAId, userBId: candidatePairs.userBId })
            .from(candidatePairs)
            .where(
                and(
                    eq(candidatePairs.status, "active"),
                    or(
                        lt(candidatePairs.expiresAt, now),
                        lt(candidatePairs.createdAt, createdAtCutoff),
                    ),
                ),
            );

        const toUpdate: typeof toExpire = [];
        const toDelete: typeof toExpire = [];

        for (const row of toExpire) {
            const existingExpired = await tx.query.candidatePairs.findFirst({
                where: and(
                    eq(candidatePairs.userAId, row.userAId),
                    eq(candidatePairs.userBId, row.userBId),
                    eq(candidatePairs.status, "expired"),
                    ne(candidatePairs.id, row.id),
                ),
            });
            if (existingExpired) {
                toDelete.push(row);
            } else {
                toUpdate.push(row);
            }
        }

        for (const row of toDelete) {
            await tx.delete(candidatePairs).where(eq(candidatePairs.id, row.id));
        }

        const updated =
            toUpdate.length > 0
                ? await tx
                      .update(candidatePairs)
                      .set({ status: "expired", updatedAt: now })
                      .where(inArray(candidatePairs.id, toUpdate.map((r) => r.id)))
                      .returning({ id: candidatePairs.id })
                : [];

        for (const row of updated) {
            await recordCandidatePairHistory(tx, {
                pairId: row.id,
                eventType: "expired",
                fromStatus: "active",
                toStatus: "expired",
            });
        }

        return [...updated, ...toDelete.map((r) => ({ id: r.id }))];
    });

    return expired;
}

export async function getActiveExposureCount(userId: string) {
    const result = await readDb
        .select({ count: sql<number>`count(*)::int` })
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "active"),
                gte(candidatePairs.expiresAt, new Date()),
                or(
                    eq(candidatePairs.userAId, userId),
                    eq(candidatePairs.userBId, userId),
                ),
            ),
        );

    return result[0]?.count ?? 0;
}

type PairAggregate = {
    hasClosedOrMutual: boolean;
    hasActive: boolean;
    oldestExpiredCreatedAt: Date | null;
};

/**
 * Aggregates all candidate_pairs rows per (userId, otherUserId).
 * closed/mutual = never recreate this dyad. active/queued = already in flight.
 * expired = cooldown applies before re-pairing the same two people.
 * Fixes bug where multiple rows (e.g. closed + expired) caused passed users to reappear.
 */
async function getExistingPairMap(userId: string): Promise<Map<string, PairAggregate>> {
    const rows = await readDb
        .select()
        .from(candidatePairs)
        .where(
            or(
                eq(candidatePairs.userAId, userId),
                eq(candidatePairs.userBId, userId),
            ),
        );

    const byOther = new Map<string, PairAggregate>();

    for (const row of rows) {
        const other = getOtherUserId(row, userId);
        const existing = byOther.get(other) ?? {
            hasClosedOrMutual: false,
            hasActive: false,
            oldestExpiredCreatedAt: null as Date | null,
        };

        if (row.status === "closed" || row.status === "mutual") existing.hasClosedOrMutual = true;
        if (row.status === "active" || row.status === "queued") existing.hasActive = true;
        if (row.status === "expired") {
            existing.oldestExpiredCreatedAt =
                !existing.oldestExpiredCreatedAt || row.createdAt < existing.oldestExpiredCreatedAt
                    ? row.createdAt
                    : existing.oldestExpiredCreatedAt;
        }

        byOther.set(other, existing);
    }

    return byOther;
}

async function getBlockedUserIds(userId: string) {
    const [blockedRows, blockedByRows] = await Promise.all([
        readDb
            .select({ id: blocks.blockedId })
            .from(blocks)
            .where(eq(blocks.blockerId, userId)),
        readDb
            .select({ id: blocks.blockerId })
            .from(blocks)
            .where(eq(blocks.blockedId, userId)),
    ]);

    return new Set([
        ...blockedRows.map((row) => row.id),
        ...blockedByRows.map((row) => row.id),
    ]);
}

/**
 * Users this viewer has explicitly passed (closed row + my decision is passed).
 * The rejectee is not added here — they remain eligible for other people; the dead dyad
 * is enforced separately via {@link getExistingPairMap} `hasClosedOrMutual`.
 */
async function getUsersIPassedIds(userId: string): Promise<Set<string>> {
    const rows = await readDb
        .select({
            userAId: candidatePairs.userAId,
            userBId: candidatePairs.userBId,
            aDecision: candidatePairs.aDecision,
            bDecision: candidatePairs.bDecision,
        })
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "closed"),
                or(
                    and(eq(candidatePairs.userAId, userId), eq(candidatePairs.aDecision, "passed")),
                    and(eq(candidatePairs.userBId, userId), eq(candidatePairs.bDecision, "passed")),
                ),
            ),
        );

    return collectUsersIPassedIds(userId, rows);
}

async function getMatchedUserIds(userId: string) {
    const legacyMatches = await readDb
        .select({
            user1Id: matches.user1Id,
            user2Id: matches.user2Id,
        })
        .from(matches)
        .where(
            or(
                eq(matches.user1Id, userId),
                eq(matches.user2Id, userId),
            ),
        );

    const mutualRows = await readDb
        .select({
            userAId: mutualMatches.userAId,
            userBId: mutualMatches.userBId,
        })
        .from(mutualMatches)
        .where(
            and(
                ne(mutualMatches.status, "cancelled"),
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
            ),
        );

    return new Set([
        ...legacyMatches.map((row) => (row.user1Id === userId ? row.user2Id : row.user1Id)),
        ...mutualRows.map((row) => (row.userAId === userId ? row.userBId : row.userAId)),
    ]);
}

/** Days since any candidate_pair involving this user was created; no history => waitDays 0 and no relax-by-wait. */
async function getWaitContextForUser(userId: string): Promise<{ waitDays: number; hasPairHistory: boolean }> {
    const row = await readDb
        .select({ createdAt: candidatePairs.createdAt })
        .from(candidatePairs)
        .where(or(eq(candidatePairs.userAId, userId), eq(candidatePairs.userBId, userId)))
        .orderBy(desc(candidatePairs.createdAt))
        .limit(1);

    if (row.length === 0) {
        return { waitDays: 0, hasPairHistory: false };
    }
    const ms = Date.now() - row[0].createdAt.getTime();
    return { waitDays: Math.max(0, Math.floor(ms / 86400000)), hasPairHistory: true };
}

/** Approximate count of visible profiles in the genders the viewer seeks (same filters as candidate fetch). */
async function getOppositeGenderPoolCount(excludedIds: string[], targetGenders: string[]): Promise<number> {
    if (targetGenders.length === 0) {
        return 10_000;
    }
    const result = await readDb
        .select({ c: sql<number>`count(*)::int` })
        .from(profiles)
        .where(
            and(
                notInArray(profiles.userId, excludedIds),
                eq(profiles.isVisible, true),
                eq(profiles.profileCompleted, true),
                eq(profiles.discoveryPaused, false),
                eq(profiles.incognitoMode, false),
                inArray(profiles.gender, targetGenders),
            ),
        );
    return result[0]?.c ?? 0;
}

function buildBoostedCompatibilityScore(
    baseScore: number,
    _currentProfile: typeof profiles.$inferSelect,
    _candidateProfile: typeof profiles.$inferSelect,
    _candidateUserLastActive?: Date | null,
) {
    return Math.max(0, Math.min(100, Math.round(baseScore)));
}

function buildReasons(
    baseReasons: string[],
    _currentProfile: typeof profiles.$inferSelect,
    _candidateProfile: typeof profiles.$inferSelect,
): string[] {
    return Array.from(new Set(baseReasons)).slice(0, 4);
}

export function startOfUtcDay(from: Date): Date {
    return new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
}

export function addUtcDays(from: Date, days: number): Date {
    const d = new Date(from.getTime());
    d.setUTCDate(d.getUTCDate() + days);
    return d;
}

/** First instant of the next UTC calendar day (after the current UTC date of `from`). */
export function startOfNextUtcDay(from: Date = new Date()): Date {
    return addUtcDays(startOfUtcDay(from), 1);
}

const QUEUED_PLACEHOLDER_EXPIRY_MS = 10 * 365 * 24 * 60 * 60 * 1000;

function placeholderExpiresAtForQueued(revealAt: Date): Date {
    return new Date(revealAt.getTime() + QUEUED_PLACEHOLDER_EXPIRY_MS);
}

async function sendNewCandidateMatchPushes(pairId: string, userAId: string, userBId: string) {
    const rows = await readDb
        .select({ id: user.id, pushToken: user.pushToken })
        .from(user)
        .where(inArray(user.id, [userAId, userBId]));

    const payload = {
        title: "New match for you ✨",
        body: "Open Home to see who we picked for you.",
        data: {
            type: NOTIFICATION_TYPES.NEW_CANDIDATE_MATCH,
            pairId,
            route: "/(tabs)",
        },
    };

    for (const row of rows) {
        if (!row.pushToken) continue;
        try {
            await sendPushNotification(row.pushToken, payload);
        } catch (e) {
            console.error("[candidate-pairs] push failed", row.id, e);
        }
    }
}

async function userHasQueuedPairsInvolving(userId: string): Promise<boolean> {
    const row = await readDb
        .select({ id: candidatePairs.id })
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "queued"),
                or(eq(candidatePairs.userAId, userId), eq(candidatePairs.userBId, userId)),
            ),
        )
        .limit(1);
    return row.length > 0;
}

/** True if this user has at least one queued introduction scheduled for a future UTC instant. */
export async function getHasUpcomingQueuedForUser(userId: string): Promise<boolean> {
    const now = new Date();
    const row = await readDb
        .select({ id: candidatePairs.id })
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "queued"),
                isNotNull(candidatePairs.revealAt),
                gt(candidatePairs.revealAt, now),
                or(eq(candidatePairs.userAId, userId), eq(candidatePairs.userBId, userId)),
            ),
        )
        .limit(1);
    return row.length > 0;
}

async function findPromotableQueuedPairForUser(userId: string, now: Date) {
    const candidates = await readDb
        .select()
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "queued"),
                isNotNull(candidatePairs.revealAt),
                lte(candidatePairs.revealAt, now),
                or(eq(candidatePairs.userAId, userId), eq(candidatePairs.userBId, userId)),
            ),
        )
        .orderBy(asc(candidatePairs.revealAt), asc(candidatePairs.createdAt))
        .limit(12);

    for (const row of candidates) {
        const other = getOtherUserId(row, userId);
        const otherActive = await getActiveCandidatePairsForUser(other);
        if (otherActive.length === 0) {
            return row;
        }
    }
    return null;
}

/**
 * Activates the next due queued introduction for this user (if any), when neither side already has an active card.
 * Returns true if a row was promoted.
 */
export async function promoteDueQueuedPairsForUser(userId: string): Promise<boolean> {
    const now = new Date();
    const selfActive = await getActiveCandidatePairsForUser(userId);
    if (selfActive.length > 0) {
        return false;
    }

    const row = await findPromotableQueuedPairForUser(userId, now);
    if (!row) {
        return false;
    }

    const expiresAt = new Date(now.getTime() + CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000);

    const updated = await db.transaction(async (tx) => {
        const [upd] = await tx
            .update(candidatePairs)
            .set({
                status: "active",
                revealAt: null,
                expiresAt,
                shownToAAt: now,
                shownToBAt: now,
                updatedAt: now,
            })
            .where(and(eq(candidatePairs.id, row.id), eq(candidatePairs.status, "queued")))
            .returning({
                id: candidatePairs.id,
                userAId: candidatePairs.userAId,
                userBId: candidatePairs.userBId,
            });

        if (!upd) {
            return null;
        }

        await recordCandidatePairHistory(tx, {
            pairId: upd.id,
            eventType: "promoted",
            fromStatus: "queued",
            toStatus: "active",
            metadata: {},
        });

        return upd;
    });

    if (updated) {
        void sendNewCandidateMatchPushes(updated.id, updated.userAId, updated.userBId);
        return true;
    }

    return false;
}

export async function generateCandidatePairsForUser(userId: string) {
    console.log("[candidate-pairs] generateCandidatePairsForUser", { userId });

    await expireCandidatePairs();

    await promoteDueQueuedPairsForUser(userId);

    const existingActivePairs = await getActiveCandidatePairsForUser(userId);
    if (existingActivePairs.length > 0) {
        console.log("[candidate-pairs] returning existing pairs:", existingActivePairs.length);
        return existingActivePairs;
    }

    if (await userHasQueuedPairsInvolving(userId)) {
        console.log("[candidate-pairs] skip generate: user still has queued rows (future or blocked)");
        return [];
    }

    const currentProfile = await readDb.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!currentProfile) {
        console.log("[candidate-pairs] SKIP: no profile found for user");
        return [];
    }

    const profileReasons: string[] = [];
    if (!currentProfile.profileCompleted) profileReasons.push("profileCompleted=false");
    if (!currentProfile.isVisible) profileReasons.push("isVisible=false");
    if (currentProfile.discoveryPaused) profileReasons.push("discoveryPaused=true");
    if (currentProfile.incognitoMode) profileReasons.push("incognitoMode=true");

    if (profileReasons.length > 0) {
        console.log("[candidate-pairs] SKIP: profile ineligible:", profileReasons);
        return [];
    }

    const [blockedIds, matchedIds, usersIPassedIds, existingPairMap, waitContext] = await Promise.all([
        getBlockedUserIds(userId),
        getMatchedUserIds(userId),
        getUsersIPassedIds(userId),
        getExistingPairMap(userId),
        getWaitContextForUser(userId),
    ]);

    const targetGenders = getTargetGenders(
        currentProfile.gender,
        currentProfile.interestedIn as string[] | null,
    );

    const excludedIds = [
        userId,
        ...blockedIds,
        ...matchedIds,
        ...usersIPassedIds,
    ];

    const candidateProfiles = await readDb.query.profiles.findMany({
        where: and(
            notInArray(profiles.userId, excludedIds),
            eq(profiles.isVisible, true),
            eq(profiles.profileCompleted, true),
            eq(profiles.discoveryPaused, false),
            eq(profiles.incognitoMode, false),
            targetGenders.length > 0 ? inArray(profiles.gender, targetGenders) : undefined,
        ),
        with: { user: true },
        limit: 60,
    });

    const cooldownCutoff = new Date(Date.now() - EXPIRED_PAIR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const reciprocalCandidates = candidateProfiles.filter((candidate) => {
        if (!isReciprocalGenderMatch(currentProfile.gender, candidate.gender, candidate.interestedIn as string[] | null)) {
            return false;
        }

        const agg = existingPairMap.get(candidate.userId);
        return !shouldSkipCandidateForExistingDyad(agg, cooldownCutoff);
    });

    const reciprocalPoolSize = reciprocalCandidates.length;

    const oppositePoolCount = await getOppositeGenderPoolCount(excludedIds, targetGenders);
    const fairnessConfig = getFairnessRelaxConfig();

    const imbalanceOppositeMin = Number(process.env.MATCH_IMBALANCE_OPPOSITE_MIN) || 10;
    const imbalanceExtraRelaxStep =
        process.env.MATCH_IMBALANCE_RELAX_ENABLED === "true" &&
        targetGenders.length > 0 &&
        oppositePoolCount < imbalanceOppositeMin;

    const effectiveMin = computeEffectiveMinScore({
        baseMin: MIN_CANDIDATE_MATCH_SCORE,
        absoluteFloor: MIN_CANDIDATE_MATCH_SCORE_FLOOR,
        waitDays: waitContext.waitDays,
        hasPairHistory: waitContext.hasPairHistory,
        reciprocalPoolSize,
        imbalanceExtraRelaxStep,
        config: fairnessConfig,
    });

    console.log("[candidate-pairs] pool:", {
        candidateProfilesCount: candidateProfiles.length,
        excludedIdsCount: excludedIds.length,
        blockedCount: blockedIds.size,
        matchedCount: matchedIds.size,
        usersIPassedCount: usersIPassedIds.size,
        targetGenders: targetGenders.length > 0 ? targetGenders : "any",
        expiryMinutes: EXPIRY_MINUTES,
        cooldownDays: EXPIRED_PAIR_COOLDOWN_DAYS,
        existingPairsInMap: existingPairMap.size,
        minScore: MIN_CANDIDATE_MATCH_SCORE,
        effectiveMin,
        scoreFloor: MIN_CANDIDATE_MATCH_SCORE_FLOOR,
        waitDays: waitContext.waitDays,
        hasPairHistory: waitContext.hasPairHistory,
        reciprocalPoolSize,
        oppositePoolCount,
        imbalanceExtraRelaxStep,
        maxQueue: MAX_CANDIDATE_QUEUE_SIZE,
    });

    console.log("[candidate-pairs] after reciprocal filter:", reciprocalPoolSize);

    const scoredCandidates = await Promise.all(
        reciprocalCandidates.map(async (candidate) => {
            const exposureCount = await getActiveExposureCount(candidate.userId);
            if (exposureCount >= ACTIVE_EXPOSURE_CAP) {
                return null;
            }

            const { score, reasons } = await computeCompatibility(userId, candidate.userId);

            return {
                candidate,
                score: buildBoostedCompatibilityScore(
                    score,
                    currentProfile,
                    candidate,
                    candidate.user?.lastActive ?? candidate.lastActive ?? null,
                ),
                reasons: buildReasons(reasons, currentProfile, candidate),
                activeExposureCount: exposureCount,
            };
        }),
    );

    const aboveThreshold = scoredCandidates
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => entry.score >= effectiveMin)
        .sort((left, right) =>
            compareScoredCandidatesForFairness(
                {
                    score: left.score,
                    candidateUserId: left.candidate.userId,
                    activeExposureCount: left.activeExposureCount,
                },
                {
                    score: right.score,
                    candidateUserId: right.candidate.userId,
                    activeExposureCount: right.activeExposureCount,
                },
            ),
        )
        .slice(0, MAX_CANDIDATE_QUEUE_SIZE);

    const filteredByExposure = scoredCandidates.filter((e) => e === null).length;
    if (filteredByExposure > 0) {
        console.log("[candidate-pairs] filtered by exposure cap:", filteredByExposure);
    }

    if (aboveThreshold.length === 0) {
        const scored = scoredCandidates.filter(
            (e): e is NonNullable<typeof e> => Boolean(e),
        );
        const scores = scored.map((e) => e.score);
        const maxScore = scores.length > 0 ? Math.max(...scores) : null;
        const minScore = scores.length > 0 ? Math.min(...scores) : null;

        console.log("[candidate-pairs] SKIP below effective min", {
            viewerUserId: userId,
            effectiveMin,
            baseMinScore: MIN_CANDIDATE_MATCH_SCORE,
            scoreFloor: MIN_CANDIDATE_MATCH_SCORE_FLOOR,
            reciprocalPoolSize,
            scoredCount: scored.length,
            exposureFilteredCount: filteredByExposure,
            maxScore,
            minScore,
            scored: scored.map((e) => ({
                candidateUserId: e.candidate.userId,
                score: e.score,
                gapToEffectiveMin: effectiveMin - e.score,
                compatibilityReasons: e.reasons,
            })),
        });
        return [];
    }

    console.log("[candidate-pairs] selected batch:", aboveThreshold.length, "pairs");

    const now = new Date();
    const activeExpiresAt = new Date(now.getTime() + CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000);
    const firstRevealBase = startOfNextUtcDay(now);

    const newActivePairIds: string[] = [];

    await db.transaction(async (tx) => {
        for (let i = 0; i < aboveThreshold.length; i++) {
            const entry = aboveThreshold[i];
            const { userAId, userBId } = canonicalizePairUsers(userId, entry.candidate.userId);
            const existing = await tx.query.candidatePairs.findFirst({
                where: and(
                    eq(candidatePairs.userAId, userAId),
                    eq(candidatePairs.userBId, userBId),
                    inArray(candidatePairs.status, ["active", "queued"]),
                ),
            });

            if (existing) continue;

            const isImmediate = i === 0;
            const revealAt = isImmediate ? null : addUtcDays(firstRevealBase, i - 1);
            const expiresAt = isImmediate ? activeExpiresAt : placeholderExpiresAtForQueued(revealAt!);

            const [pair] = await tx
                .insert(candidatePairs)
                .values({
                    userAId,
                    userBId,
                    compatibilityScore: entry.score,
                    matchReasons: entry.reasons,
                    shownToAAt: now,
                    shownToBAt: now,
                    expiresAt,
                    status: isImmediate ? "active" : "queued",
                    revealAt,
                    aDecision: "pending",
                    bDecision: "pending",
                })
                .returning({ id: candidatePairs.id });

            await recordCandidatePairHistory(tx, {
                pairId: pair.id,
                eventType: "generated",
                toStatus: isImmediate ? "active" : "queued",
                metadata: {
                    score: entry.score,
                    reasons: entry.reasons,
                    queueIndex: i,
                },
            });

            if (isImmediate) {
                newActivePairIds.push(pair.id);
            }
        }
    });

    for (const pairId of newActivePairIds) {
        const row = await readDb.query.candidatePairs.findFirst({
            where: eq(candidatePairs.id, pairId),
        });
        if (row) {
            void sendNewCandidateMatchPushes(row.id, row.userAId, row.userBId);
        }
    }

    const result = await getActiveCandidatePairsForUser(userId);
    console.log("[candidate-pairs] created", result.length, "active pairs for user");
    return result;
}

export async function getActiveCandidatePairsForUser(userId: string) {
    const now = new Date();
    const expiryMs = CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000;
    const createdAtCutoff = new Date(now.getTime() - expiryMs);

    const rows = await readDb
        .select()
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "active"),
                gte(candidatePairs.expiresAt, now),
                gte(candidatePairs.createdAt, createdAtCutoff),
                or(
                    eq(candidatePairs.userAId, userId),
                    eq(candidatePairs.userBId, userId),
                ),
            ),
        )
        .orderBy(desc(candidatePairs.compatibilityScore), desc(candidatePairs.createdAt));

    const result = await Promise.all(
        rows.map(async (pair) => {
            const otherUserId = getOtherUserId(pair, userId);
            const profile = await readDb.query.profiles.findFirst({
                where: eq(profiles.userId, otherUserId),
                with: { user: true },
            });

            if (!profile) return null;

            const interests = Array.isArray(profile.interests) ? profile.interests : [];
            const personalityAnswers = profile.personalityAnswers as Record<string, unknown> | null;
            const personalityTags: string[] = [];
            if (personalityAnswers?.sleepSchedule) personalityTags.push(String(personalityAnswers.sleepSchedule).replace(/_/g, " "));
            if (personalityAnswers?.socialBattery) personalityTags.push(String(personalityAnswers.socialBattery).replace(/_/g, " "));
            if (personalityAnswers?.convoStyle) personalityTags.push(String(personalityAnswers.convoStyle).replace(/_/g, " "));

            return {
                pairId: pair.id,
                userId: otherUserId,
                firstName: profile.firstName || profile.user?.name?.split(" ")[0] || "Unknown",
                age: profile.age ?? 0,
                profilePhoto: profile.profilePhoto ?? profile.user?.profilePhoto ?? profile.user?.image,
                compatibilityScore: pair.compatibilityScore,
                reasons: pair.matchReasons,
                bio: profile.bio ?? profile.aboutMe ?? undefined,
                interests,
                personalityTags,
                course: profile.course ?? undefined,
                university: profile.university ?? undefined,
                currentUserDecision: getCurrentUserDecision(pair, userId),
                status: pair.status,
                expiresAt: pair.expiresAt.toISOString(),
                expiresInMs: Math.max(0, pair.expiresAt.getTime() - now.getTime()),
            };
        }),
    );

    return result
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((left, right) => right.compatibilityScore - left.compatibilityScore)
        .slice(0, DAILY_CANDIDATE_PAIR_LIMIT);
}

export async function getCandidatePairByIdForUser(pairId: string, userId: string) {
    const pair = await readDb.query.candidatePairs.findFirst({
        where: eq(candidatePairs.id, pairId),
    });

    if (!pair) return null;
    if (pair.userAId !== userId && pair.userBId !== userId) return null;
    return pair;
}

export async function findActiveCandidatePairBetweenUsers(userId: string, otherUserId: string) {
    const { userAId, userBId } = canonicalizePairUsers(userId, otherUserId);
    return readDb.query.candidatePairs.findFirst({
        where: and(
            eq(candidatePairs.userAId, userAId),
            eq(candidatePairs.userBId, userBId),
            eq(candidatePairs.status, "active"),
            gte(candidatePairs.expiresAt, new Date()),
        ),
    });
}

export async function respondToCandidatePair(
    pairId: string,
    userId: string,
    decision: Exclude<CandidateDecision, "pending">,
) {
    const now = new Date();

    return db.transaction(async (tx) => {
        const pair = await tx.query.candidatePairs.findFirst({
            where: eq(candidatePairs.id, pairId),
        });

        if (!pair) {
            throw new Error("Candidate pair not found");
        }

        const role = getPairRole(pair, userId);
        if (!role) {
            throw new Error("You do not belong to this pair");
        }

        if (pair.status !== "active") {
            throw new Error("This pair is no longer active");
        }

        if (pair.expiresAt < now) {
            throw new Error("This pair has expired");
        }

        if ((role === "a" && pair.aDecision !== "pending") || (role === "b" && pair.bDecision !== "pending")) {
            throw new Error("You have already responded to this pair");
        }

        const nextADecision = role === "a" ? decision : pair.aDecision;
        const nextBDecision = role === "b" ? decision : pair.bDecision;

        const nextStatus = resolveCandidatePairStatus(nextADecision, nextBDecision);

        const existingSameStatus = await tx.query.candidatePairs.findFirst({
            where: and(
                eq(candidatePairs.userAId, pair.userAId),
                eq(candidatePairs.userBId, pair.userBId),
                eq(candidatePairs.status, nextStatus),
                ne(candidatePairs.id, pairId),
            ),
        });

        let updatedPair: typeof pair;

        if (existingSameStatus) {
            await tx.delete(candidatePairs).where(eq(candidatePairs.id, pairId));
            updatedPair = { ...pair, aDecision: nextADecision, bDecision: nextBDecision, status: nextStatus, updatedAt: now };
        } else {
            const [upd] = await tx
                .update(candidatePairs)
                .set({
                    aDecision: nextADecision,
                    bDecision: nextBDecision,
                    status: nextStatus,
                    updatedAt: now,
                })
                .where(eq(candidatePairs.id, pairId))
                .returning();
            updatedPair = upd!;

            await recordCandidatePairHistory(tx, {
                pairId: updatedPair.id,
                actorUserId: userId,
                eventType:
                    nextStatus === "mutual"
                        ? "mutual"
                        : nextStatus === "closed"
                            ? "closed"
                            : "responded",
                fromStatus: pair.status,
                toStatus: nextStatus,
                metadata: {
                    decision,
                    aDecision: nextADecision,
                    bDecision: nextBDecision,
                },
            });
        }

        let mutual = null;
        if (nextStatus === "mutual") {
            const pairIdForMutual = existingSameStatus ? existingSameStatus.id : updatedPair.id;
            mutual = await tx.query.mutualMatches.findFirst({
                where: eq(mutualMatches.candidatePairId, pairIdForMutual),
            });

            if (!mutual && !existingSameStatus) {
                const [createdMutual] = await tx
                    .insert(mutualMatches)
                    .values({
                        candidatePairId: updatedPair.id,
                        userAId: updatedPair.userAId,
                        userBId: updatedPair.userBId,
                        status: "mutual",
                    })
                    .returning();
                mutual = createdMutual;
            }
        }

        return { pair: updatedPair, mutual };
    });
}
