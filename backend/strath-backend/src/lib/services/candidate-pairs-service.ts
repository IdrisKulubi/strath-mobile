import { and, asc, desc, eq, gt, gte, inArray, isNotNull, isNull, lt, lte, ne, notInArray, or, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    blocks,
    candidatePairHistory,
    candidatePairs,
    dateMatches,
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
import { expireQueuedPairsForUser, isUserOnMatchHold } from "@/lib/services/match-hold-service";
import { getPaymentsEnabled } from "@/lib/payments/payment-flags";
import { buildDateMatchPaymentInsert } from "@/lib/payments/payment-init";
import { assignMeetupSlot } from "@/lib/services/meetup-slot-service";
import { isAdminMatchPreviewUser, resolveMatchExcludedUserIds } from "@/lib/services/match-exclusion-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export const DAILY_CANDIDATE_PAIR_LIMIT = Number(process.env.DAILY_CANDIDATE_PAIR_LIMIT) || 5;
export const DAILY_CANDIDATE_DECISION_LIMIT = Number(process.env.DAILY_CANDIDATE_DECISION_LIMIT) || 32;
export const MANUAL_CURATED_PAIR_EXPIRES_AT = new Date("2099-12-31T23:59:59.000Z");

// Expiry: env CANDIDATE_PAIR_EXPIRY_MINUTES (default 2880 = 48h). Use 5 for testing.
const EXPIRY_MINUTES = Number(process.env.CANDIDATE_PAIR_EXPIRY_MINUTES) || 2880;
export const CANDIDATE_PAIR_EXPIRY_HOURS = EXPIRY_MINUTES / 60;
// Cooldown: when expiry < 1h (testing), use 1-min cooldown. Otherwise 7 days.
export const EXPIRED_PAIR_COOLDOWN_DAYS = CANDIDATE_PAIR_EXPIRY_HOURS < 1 ? 1 / (24 * 60) : 7;

/** Minimum compatibility (0–100) required before creating a candidate pair or queue slot. */
export const MIN_CANDIDATE_MATCH_SCORE = Number(process.env.MIN_CANDIDATE_MATCH_SCORE) || 72;
/** Never relax effective minimum below this (0–100). */
const MIN_CANDIDATE_MATCH_SCORE_FLOOR = Number(process.env.MIN_CANDIDATE_MATCH_SCORE_FLOOR) || 62;
/** Max curated introductions per batch: one goes live immediately, the rest queue for later UTC days. */
export const MAX_CANDIDATE_QUEUE_SIZE = Number(process.env.MAX_CANDIDATE_QUEUE_SIZE) || 5;

function getFairnessRelaxConfig(): FairnessRelaxConfig {
    const maxRelax = Number(process.env.MATCH_MAX_SCORE_RELAX_STEPS) || 4;
    const sparseExtra = Number(process.env.MATCH_SPARSE_EXTRA_RELAX_STEPS) || 1;
    return {
        waitDaysBeforeRelax: Number(process.env.MATCH_WAIT_DAYS_BEFORE_RELAX) || 3,
        scoreRelaxPerStep: Number(process.env.MATCH_SCORE_RELAX_PER_STEP) || 3,
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
            | "reminder_sent"
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
                    sql`not exists (
                        select 1 from ${candidatePairHistory}
                        where ${candidatePairHistory.pairId} = ${candidatePairs.id}
                        and ${candidatePairHistory.eventType} = 'generated'
                        and ${candidatePairHistory.metadata}->>'source' = 'admin_curated'
                    )`,
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
            const expiredAt = row.updatedAt ?? row.createdAt;
            existing.oldestExpiredCreatedAt =
                !existing.oldestExpiredCreatedAt || expiredAt > existing.oldestExpiredCreatedAt
                    ? expiredAt
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

async function getUsersOnActiveMatchHolds() {
    const rows = await readDb
        .select({
            userAId: mutualMatches.userAId,
            userBId: mutualMatches.userBId,
        })
        .from(mutualMatches)
        .where(inArray(mutualMatches.status, ["mutual", "being_arranged", "upcoming"]));

    return new Set(rows.flatMap((row) => [row.userAId, row.userBId]));
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
        title: "New matches are ready",
        body: "Open StrathSpace to see who we found for you.",
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

async function sendCandidateReminderPush(userId: string, payload: { title: string; body: string; pairId: string }) {
    const row = await readDb.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { pushToken: true },
    });

    if (!row?.pushToken) return false;

    await sendPushNotification(row.pushToken, {
        title: payload.title,
        body: payload.body,
        data: {
            type: NOTIFICATION_TYPES.NEW_CANDIDATE_MATCH,
            pairId: payload.pairId,
            route: "/(tabs)",
        },
    });
    return true;
}

async function hasActiveOneSidedInterestForUser(userId: string, now = new Date()) {
    const row = await readDb
        .select({ id: candidatePairs.id })
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "active"),
                gte(candidatePairs.expiresAt, now),
                or(
                    eq(candidatePairs.userAId, userId),
                    eq(candidatePairs.userBId, userId),
                ),
                or(
                    and(
                        eq(candidatePairs.aDecision, "open_to_meet"),
                        eq(candidatePairs.bDecision, "pending"),
                    ),
                    and(
                        eq(candidatePairs.bDecision, "open_to_meet"),
                        eq(candidatePairs.aDecision, "pending"),
                    ),
                ),
            ),
        )
        .limit(1);

    return row.length > 0;
}

async function getOpenSlotClearingWindowForUser(userId: string, now = new Date()) {
    const rows = await readDb
        .select({ id: candidatePairs.id, expiresAt: candidatePairs.expiresAt })
        .from(candidatePairs)
        .where(
            and(
                gte(candidatePairs.expiresAt, now),
                or(
                    and(
                        eq(candidatePairs.userAId, userId),
                        eq(candidatePairs.aDecision, "passed"),
                        inArray(candidatePairs.status, ["closed", "expired"]),
                    ),
                    and(
                        eq(candidatePairs.userBId, userId),
                        eq(candidatePairs.bDecision, "passed"),
                        inArray(candidatePairs.status, ["closed", "expired"]),
                    ),
                ),
            ),
        )
        .orderBy(desc(candidatePairs.expiresAt))
        .limit(1);

    return rows[0] ?? null;
}

async function hasOpenSlotClearingWindowForUser(userId: string, now = new Date()) {
    return Boolean(await getOpenSlotClearingWindowForUser(userId, now));
}

export async function sendPendingCandidatePairReminders(now = new Date()) {
    const oneSidedCutoff = new Date(now.getTime() - 30 * 60 * 1000);
    const expiringSoonCutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const oneSidedPairs = await readDb
        .select()
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "active"),
                gt(candidatePairs.expiresAt, now),
                lte(candidatePairs.updatedAt, oneSidedCutoff),
                isNull(candidatePairs.oneSidedReminderSentAt),
                or(
                    and(eq(candidatePairs.aDecision, "open_to_meet"), eq(candidatePairs.bDecision, "pending")),
                    and(eq(candidatePairs.bDecision, "open_to_meet"), eq(candidatePairs.aDecision, "pending")),
                ),
            ),
        )
        .limit(200);

    let oneSidedSent = 0;
    for (const pair of oneSidedPairs) {
        const pendingUserId = pair.aDecision === "pending" ? pair.userAId : pair.userBId;
        const [updated] = await db
            .update(candidatePairs)
            .set({ oneSidedReminderSentAt: now })
            .where(and(eq(candidatePairs.id, pair.id), isNull(candidatePairs.oneSidedReminderSentAt)))
            .returning({ id: candidatePairs.id });

        if (!updated) continue;
        const sent = await sendCandidateReminderPush(pendingUserId, {
            pairId: pair.id,
            title: "A good intro is waiting",
            body: "Take a look at today's pick before it closes.",
        }).catch((error) => {
            console.error("[candidate-pairs] one-sided reminder failed", { pairId: pair.id, pendingUserId, error });
            return false;
        });
        if (sent) oneSidedSent++;

        await db.insert(candidatePairHistory).values({
            pairId: pair.id,
            actorUserId: pendingUserId,
            eventType: "reminder_sent",
            fromStatus: pair.status,
            toStatus: pair.status,
            metadata: { kind: "one_sided_interest" },
        }).catch(() => {});
    }

    const expiringPairs = await readDb
        .select()
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "active"),
                gt(candidatePairs.expiresAt, now),
                lte(candidatePairs.expiresAt, expiringSoonCutoff),
                isNull(candidatePairs.reminderSentAt),
                or(eq(candidatePairs.aDecision, "pending"), eq(candidatePairs.bDecision, "pending")),
            ),
        )
        .limit(200);

    let expiringSent = 0;
    for (const pair of expiringPairs) {
        const pendingUserIds = [
            pair.aDecision === "pending" ? pair.userAId : null,
            pair.bDecision === "pending" ? pair.userBId : null,
        ].filter((id): id is string => Boolean(id));

        const [updated] = await db
            .update(candidatePairs)
            .set({ reminderSentAt: now })
            .where(and(eq(candidatePairs.id, pair.id), isNull(candidatePairs.reminderSentAt)))
            .returning({ id: candidatePairs.id });

        if (!updated) continue;

        for (const pendingUserId of pendingUserIds) {
            const sent = await sendCandidateReminderPush(pendingUserId, {
                pairId: pair.id,
                title: "Your intro closes soon",
                body: "Still interested? Check today's pick before it expires.",
            }).catch((error) => {
                console.error("[candidate-pairs] expiry reminder failed", { pairId: pair.id, pendingUserId, error });
                return false;
            });
            if (sent) expiringSent++;
        }

        await db.insert(candidatePairHistory).values({
            pairId: pair.id,
            eventType: "reminder_sent",
            fromStatus: pair.status,
            toStatus: pair.status,
            metadata: { kind: "expiring_pending", pendingUserCount: pendingUserIds.length },
        }).catch(() => {});
    }

    return {
        oneSidedChecked: oneSidedPairs.length,
        oneSidedSent,
        expiringChecked: expiringPairs.length,
        expiringSent,
    };
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
        if (await hasActiveOneSidedInterestForUser(other, now)) {
            continue;
        }
        if (await hasOpenSlotClearingWindowForUser(other, now)) {
            continue;
        }
        const otherActive = await getActiveCandidatePairsForUser(other);
        if (otherActive.length < DAILY_CANDIDATE_PAIR_LIMIT) {
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
    if (await hasActiveOneSidedInterestForUser(userId, now)) {
        return false;
    }

    if (await hasOpenSlotClearingWindowForUser(userId, now)) {
        return false;
    }

    const selfActive = await getActiveCandidatePairsForUser(userId);
    if (selfActive.length >= DAILY_CANDIDATE_PAIR_LIMIT) {
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

export async function generateCandidatePairsForUser(userId: string, options: { notify?: boolean } = {}) {
    console.log("[candidate-pairs] generateCandidatePairsForUser", { userId });

    await expireCandidatePairs();

    if (await isUserOnMatchHold(userId)) {
        console.log("[candidate-pairs] HOLD: user has active mutual/date — skip generation", { userId });
        return [];
    }

    if (await hasActiveOneSidedInterestForUser(userId)) {
        console.log("[candidate-pairs] HOLD: user has one-sided interest in flight - skip generation", { userId });
        return getActiveCandidatePairsForUser(userId);
    }

    const openSlotClearingWindow = await getOpenSlotClearingWindowForUser(userId);
    if (openSlotClearingWindow) {
        console.log("[candidate-pairs] WINDOW: pass already used a slot - skip refill", {
            userId,
            pairId: openSlotClearingWindow.id,
            windowExpiresAt: openSlotClearingWindow.expiresAt,
        });
        return getActiveCandidatePairsForUser(userId);
    }

    await promoteDueQueuedPairsForUser(userId);

    const existingActivePairs = await getActiveCandidatePairsForUser(userId);
    if (existingActivePairs.some((pair) => pair.currentUserDecision === "open_to_meet")) {
        console.log("[candidate-pairs] HOLD: existing active interest - returning hold card", { userId });
        return existingActivePairs;
    }

    if (existingActivePairs.length >= DAILY_CANDIDATE_PAIR_LIMIT) {
        console.log("[candidate-pairs] returning existing pairs:", existingActivePairs.length);
        return existingActivePairs;
    }
    const activeSlotsAvailable = Math.max(1, DAILY_CANDIDATE_PAIR_LIMIT - existingActivePairs.length);
    const hasQueuedPairs = await userHasQueuedPairsInvolving(userId);

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

    const matchExcludedUserIds = await resolveMatchExcludedUserIds();
    const allowAdminPreview = matchExcludedUserIds.has(userId) && await isAdminMatchPreviewUser(userId);
    if (matchExcludedUserIds.has(userId) && !allowAdminPreview) {
        console.log("[candidate-pairs] SKIP: user excluded from daily matchmaking (admin / staff list)", {
            userId,
        });
        return [];
    }

    const [blockedIds, matchedIds, usersIPassedIds, existingPairMap, waitContext, usersOnMatchHolds] = await Promise.all([
        getBlockedUserIds(userId),
        getMatchedUserIds(userId),
        getUsersIPassedIds(userId),
        getExistingPairMap(userId),
        getWaitContextForUser(userId),
        getUsersOnActiveMatchHolds(),
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
        ...matchExcludedUserIds,
        ...usersOnMatchHolds,
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

    console.log("[candidate-pairs] viewer profile + exclusions", {
        userId,
        allowAdminPreview,
        viewerGender: currentProfile.gender,
        interestedIn: currentProfile.interestedIn,
        targetGenders: targetGenders.length > 0 ? targetGenders : "any",
        profileCompleted: currentProfile.profileCompleted,
        isVisible: currentProfile.isVisible,
        discoveryPaused: currentProfile.discoveryPaused,
        incognitoMode: currentProfile.incognitoMode,
        matchExcludedContainsViewer: matchExcludedUserIds.has(userId),
        matchExcludedCount: matchExcludedUserIds.size,
        blockedCount: blockedIds.size,
        matchedCount: matchedIds.size,
        usersOnMatchHoldsCount: usersOnMatchHolds.size,
        usersIPassedCount: usersIPassedIds.size,
        rawCandidateCount: candidateProfiles.length,
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
    const reciprocalRejected = candidateProfiles.length - reciprocalPoolSize;

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
        reciprocalRejected,
        oppositePoolCount,
        imbalanceExtraRelaxStep,
        maxQueue: MAX_CANDIDATE_QUEUE_SIZE,
        activeSlotsAvailable,
        hasQueuedPairs,
    });

    console.log("[candidate-pairs] after reciprocal filter:", reciprocalPoolSize);

    const scoredCandidates = await Promise.all(
        reciprocalCandidates.map(async (candidate) => {
            const exposureCount = await getActiveExposureCount(candidate.userId);
            const { score, reasons } = await computeCompatibility(userId, candidate.userId);
            const boostedScore = buildBoostedCompatibilityScore(
                score,
                currentProfile,
                candidate,
                candidate.user?.lastActive ?? candidate.lastActive ?? null,
            );
            const builtReasons = buildReasons(reasons, currentProfile, candidate);

            console.log("[candidate-pairs] scored candidate", {
                viewerUserId: userId,
                candidateUserId: candidate.userId,
                firstName: candidate.firstName,
                gender: candidate.gender,
                interestedIn: candidate.interestedIn,
                course: candidate.course,
                university: candidate.university,
                baseScore: score,
                boostedScore,
                effectiveMin,
                passesThreshold: boostedScore >= effectiveMin,
                exposureCount,
                reasons: builtReasons,
            });

            return {
                candidate,
                score: boostedScore,
                reasons: builtReasons,
                activeExposureCount: exposureCount,
            };
        }),
    );

    const scored = scoredCandidates;
    const topScoredPreview = [...scored]
        .sort((left, right) => right.score - left.score)
        .slice(0, 10)
        .map((entry) => ({
            candidateUserId: entry.candidate.userId,
            firstName: entry.candidate.firstName,
            score: entry.score,
            gapToEffectiveMin: effectiveMin - entry.score,
            activeExposureCount: entry.activeExposureCount,
            reasons: entry.reasons,
        }));

    console.log("[candidate-pairs] scoring summary", {
        viewerUserId: userId,
        reciprocalPoolSize,
        scoredCount: scored.length,
        effectiveMin,
        topScoredPreview,
    });

    const aboveThreshold = scoredCandidates
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
        .slice(0, hasQueuedPairs ? activeSlotsAvailable : MAX_CANDIDATE_QUEUE_SIZE);

    if (aboveThreshold.length === 0) {
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

    console.log("[candidate-pairs] selected batch", {
        viewerUserId: userId,
        selectedCount: aboveThreshold.length,
        selected: aboveThreshold.map((entry) => ({
            candidateUserId: entry.candidate.userId,
            firstName: entry.candidate.firstName,
            score: entry.score,
            reasons: entry.reasons,
            activeExposureCount: entry.activeExposureCount,
        })),
    });

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

            const isImmediate = i < activeSlotsAvailable;
            const revealAt = isImmediate ? null : addUtcDays(firstRevealBase, i - activeSlotsAvailable);
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

    if (options.notify !== false) {
        for (const pairId of newActivePairIds) {
            const row = await readDb.query.candidatePairs.findFirst({
                where: eq(candidatePairs.id, pairId),
            });
            if (row) {
                void sendNewCandidateMatchPushes(row.id, row.userAId, row.userBId);
            }
        }
    }

    const result = await getActiveCandidatePairsForUser(userId);
    console.log("[candidate-pairs] created", result.length, "active pairs for user");
    return result;
}

export async function getActiveCandidatePairsForUser(userId: string) {
    const matchExcludedUserIds = await resolveMatchExcludedUserIds();
    if (matchExcludedUserIds.has(userId) && !(await isAdminMatchPreviewUser(userId))) {
        return [];
    }

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

    return formatCandidatePairRowsForUser(userId, rows, now, matchExcludedUserIds);
}

export async function isAdminCuratedCandidatePair(pairId: string) {
    const [row] = await readDb
        .select({ id: candidatePairHistory.id })
        .from(candidatePairHistory)
        .where(
            and(
                eq(candidatePairHistory.pairId, pairId),
                eq(candidatePairHistory.eventType, "generated"),
                sql`${candidatePairHistory.metadata}->>'source' = 'admin_curated'`,
            ),
        )
        .limit(1);

    return Boolean(row);
}

export async function getActiveAdminCuratedCandidatePairsForUser(userId: string) {
    const matchExcludedUserIds = await resolveMatchExcludedUserIds();
    if (matchExcludedUserIds.has(userId) && !(await isAdminMatchPreviewUser(userId))) {
        return [];
    }

    const now = new Date();

    const curatedRows = await readDb
        .select({ pairId: candidatePairHistory.pairId })
        .from(candidatePairHistory)
        .where(
            and(
                eq(candidatePairHistory.eventType, "generated"),
                sql`${candidatePairHistory.metadata}->>'source' = 'admin_curated'`,
            ),
        );

    const curatedPairIds = [...new Set(curatedRows.map((row) => row.pairId))];
    if (curatedPairIds.length === 0) return [];

    const rows = await readDb
        .select()
        .from(candidatePairs)
        .where(
            and(
                inArray(candidatePairs.id, curatedPairIds),
                eq(candidatePairs.status, "active"),
                or(
                    eq(candidatePairs.userAId, userId),
                    eq(candidatePairs.userBId, userId),
                ),
            ),
        )
        .orderBy(desc(candidatePairs.compatibilityScore), desc(candidatePairs.createdAt));

    return formatCandidatePairRowsForUser(userId, rows, now, matchExcludedUserIds);
}

async function formatCandidatePairRowsForUser(
    userId: string,
    rows: CandidatePairRow[],
    now: Date,
    matchExcludedUserIds: Set<string>,
) {
    const result = await Promise.all(
        rows.map(async (pair) => {
            const otherUserId = getOtherUserId(pair, userId);
            if (matchExcludedUserIds.has(otherUserId)) {
                return null;
            }
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

    const visibleRows = result
        .filter((row): row is NonNullable<typeof row> => Boolean(row))
        .sort((left, right) => right.compatibilityScore - left.compatibilityScore);

    const pendingInterestRows = visibleRows.filter((row) => row.currentUserDecision === "open_to_meet");
    if (pendingInterestRows.length > 0) {
        return pendingInterestRows.slice(0, 1);
    }

    return visibleRows.slice(0, DAILY_CANDIDATE_PAIR_LIMIT);
}

export async function getCandidatePairByIdForUser(pairId: string, userId: string) {
    const pair = await readDb.query.candidatePairs.findFirst({
        where: eq(candidatePairs.id, pairId),
    });

    if (!pair) return null;
    if (pair.userAId !== userId && pair.userBId !== userId) return null;
    return pair;
}

async function getRecentDecisionCountForUser(userId: string, now = new Date()) {
    const windowStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const [row] = await readDb
        .select({ count: sql<number>`count(*)::int` })
        .from(candidatePairHistory)
        .where(
            and(
                eq(candidatePairHistory.actorUserId, userId),
                gte(candidatePairHistory.createdAt, windowStart),
                inArray(candidatePairHistory.eventType, ["responded", "mutual", "closed"]),
            ),
        );

    return row?.count ?? 0;
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
    options?: { allowConcurrentInterest?: boolean },
) {
    const now = new Date();
    const decisionsToday = await getRecentDecisionCountForUser(userId, now);
    if (decisionsToday >= DAILY_CANDIDATE_DECISION_LIMIT) {
        throw new Error("Daily candidate decision limit reached");
    }

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

        const adminCuratedPair = await tx.query.candidatePairHistory.findFirst({
            where: and(
                eq(candidatePairHistory.pairId, pairId),
                eq(candidatePairHistory.eventType, "generated"),
                sql`${candidatePairHistory.metadata}->>'source' = 'admin_curated'`,
            ),
        });

        if (!adminCuratedPair && pair.expiresAt < now) {
            throw new Error("This pair has expired");
        }

        if ((role === "a" && pair.aDecision !== "pending") || (role === "b" && pair.bDecision !== "pending")) {
            throw new Error("You have already responded to this pair");
        }

        if (decision === "open_to_meet" && !options?.allowConcurrentInterest) {
            const existingPendingInterest = await tx.query.candidatePairs.findFirst({
                where: and(
                    ne(candidatePairs.id, pairId),
                    eq(candidatePairs.status, "active"),
                    gte(candidatePairs.expiresAt, now),
                    or(
                        eq(candidatePairs.userAId, userId),
                        eq(candidatePairs.userBId, userId),
                    ),
                    or(
                        and(
                            eq(candidatePairs.aDecision, "open_to_meet"),
                            eq(candidatePairs.bDecision, "pending"),
                        ),
                        and(
                            eq(candidatePairs.bDecision, "open_to_meet"),
                            eq(candidatePairs.aDecision, "pending"),
                        ),
                    ),
                ),
            });

            if (existingPendingInterest) {
                throw new Error("There is already an active interest waiting for a response");
            }
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
        let mutualWasJustCreated = false;
        if (nextStatus === "mutual") {
            const pairIdForMutual = existingSameStatus ? existingSameStatus.id : updatedPair.id;
            mutual = await tx.query.mutualMatches.findFirst({
                where: eq(mutualMatches.candidatePairId, pairIdForMutual),
            });

            if (!mutual && !existingSameStatus) {
                const { ensureLegacyMatch } = await import("@/lib/services/legacy-match-service");
                const legacyMatch = await ensureLegacyMatch(
                    tx,
                    updatedPair.userAId,
                    updatedPair.userBId,
                );
                const mutualAt = new Date();
                const assignment = assignMeetupSlot(mutualAt);
                const paymentsEnabled = await getPaymentsEnabled();
                const paymentFields = buildDateMatchPaymentInsert({
                    confirmBy: assignment.confirmBy,
                    enabled: paymentsEnabled,
                });
                const [createdMutual] = await tx
                    .insert(mutualMatches)
                    .values({
                        candidatePairId: updatedPair.id,
                        userAId: updatedPair.userAId,
                        userBId: updatedPair.userBId,
                        status: "mutual",
                        legacyMatchId: legacyMatch.id,
                        scheduledAt: assignment.scheduledAt,
                        slotConfirmBy: assignment.confirmBy,
                        assignedSlot: assignment.slot,
                    })
                    .returning();
                const [createdDateMatch] = await tx
                    .insert(dateMatches)
                    .values({
                        candidatePairId: updatedPair.id,
                        userAId: updatedPair.userAId,
                        userBId: updatedPair.userBId,
                        vibe: "coffee",
                        status: "pending_setup",
                        scheduledAt: assignment.scheduledAt,
                        callCompleted: false,
                        userAConfirmed: false,
                        userBConfirmed: false,
                        createdAt: mutualAt,
                        ...paymentFields,
                    })
                    .returning({ id: dateMatches.id });
                await tx
                    .update(mutualMatches)
                    .set({ legacyDateMatchId: createdDateMatch.id, updatedAt: mutualAt })
                    .where(eq(mutualMatches.id, createdMutual.id));
                mutual = {
                    ...createdMutual,
                    legacyDateMatchId: createdDateMatch.id,
                };
                mutualWasJustCreated = true;
            }
        }

        return { pair: updatedPair, mutual, mutualWasJustCreated };
    }).then(async (result) => {
        // Outside the transaction: when a mutual is freshly created, expire BOTH users' queued
        // and other-active candidate pairs so the people we had queued for them can be re-matched
        // with someone else, and so neither user gets new daily intros while the date is in flight.
        if (result.mutualWasJustCreated && result.mutual) {
            const excludeIds = [result.pair.id];
            await Promise.all([
                expireQueuedPairsForUser(result.mutual.userAId, {
                    excludePairIds: excludeIds,
                    reason: "mutual_created",
                }),
                expireQueuedPairsForUser(result.mutual.userBId, {
                    excludePairIds: excludeIds,
                    reason: "mutual_created",
                }),
            ]);

            if (
                result.mutual.scheduledAt
                && result.mutual.slotConfirmBy
            ) {
                const { sendMeetupSlotAssignedPushes } = await import(
                    "@/lib/services/meetup-push-notifications-service"
                );
                const paymentsEnabled = await getPaymentsEnabled();
                await sendMeetupSlotAssignedPushes({
                    userAId: result.mutual.userAId,
                    userBId: result.mutual.userBId,
                    scheduledAt: result.mutual.scheduledAt,
                    confirmBy: result.mutual.slotConfirmBy,
                    paymentsEnabled,
                    dateMatchId: result.mutual.legacyDateMatchId ?? undefined,
                }).catch((err) => {
                    console.warn("[candidate-pairs] meetup slot push failed", err);
                });
            }
        }
        return { pair: result.pair, mutual: result.mutual };
    });
}
