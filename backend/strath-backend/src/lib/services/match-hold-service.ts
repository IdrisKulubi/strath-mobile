import { and, eq, gt, inArray, lte, ne, or } from "drizzle-orm";
import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    candidatePairs,
    dateFeedback,
    dateMatches,
    mutualMatches,
    profiles,
} from "@/db/schema";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";

/**
 * "Match hold" = a user is in an active mutual / arranged date and should not see new daily intros
 * until that arrangement is concluded (or auto-released).
 *
 * Statuses that gate matching:
 *  - mutual, being_arranged, upcoming  -> always hold
 *  - completed -> hold UNTIL feedback submitted by this user OR auto-release grace expires
 *
 * Released:
 *  - cancelled, expired
 *  - completed AND (feedback submitted OR grace days passed since updatedAt)
 */

export type MatchHoldStatus =
    | "mutual"
    | "being_arranged"
    | "upcoming"
    | "completed_pending_feedback";

export interface MatchHold {
    mutualMatchId: string;
    candidatePairId: string;
    partnerUserId: string;
    partner: {
        firstName: string | null;
        age: number | null;
        profilePhoto: string | null;
        course: string | null;
        university: string | null;
    };
    status: MatchHoldStatus;
    venueName: string | null;
    venueAddress: string | null;
    scheduledAt: string | null;
    dateMatchId: string | null;
    needsFeedback: boolean;
    /** ISO timestamp at which the hold auto-releases if user has not submitted feedback. */
    autoReleaseAt: string | null;
    createdAt: string;
}

export interface MatchHoldCancelReason {
    reason: "no_longer_interested" | "scheduling_conflict" | "safety_concern" | "other";
    notes?: string | null;
}

const HOLD_STATUSES = ["mutual", "being_arranged", "upcoming", "completed"] as const;
const AUTO_RELEASE_STATUSES = ["mutual"] as const;
const DURABLE_HOLD_STATUSES = ["being_arranged", "upcoming", "completed"] as const;
const DEFAULT_PRE_DATE_HOLD_EXPIRY_HOURS = 72;

function getPreDateHoldExpiryHours(): number {
    const raw = Number(process.env.MATCH_HOLD_PRE_DATE_EXPIRY_HOURS);
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_PRE_DATE_HOLD_EXPIRY_HOURS;
    return Math.min(Math.floor(raw), 24 * 14);
}

function getPreDateHoldCutoff(now = new Date()): Date {
    return new Date(now.getTime() - getPreDateHoldExpiryHours() * 60 * 60 * 1000);
}

export async function releaseStalePreDateMatchHoldsForUser(userId: string, now = new Date()): Promise<number> {
    const cutoff = getPreDateHoldCutoff(now);
    const released = await db
        .update(mutualMatches)
        .set({ status: "expired", updatedAt: now })
        .where(
            and(
                inArray(mutualMatches.status, [...AUTO_RELEASE_STATUSES]),
                lte(mutualMatches.updatedAt, cutoff),
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
            ),
        )
        .returning({ id: mutualMatches.id });

    if (released.length > 0) {
        console.log("[match-hold] auto-released stale pre-date holds", {
            userId,
            count: released.length,
            cutoff: cutoff.toISOString(),
        });
    }

    return released.length;
}

export async function releaseStalePreDateMatchHolds(now = new Date()): Promise<number> {
    const cutoff = getPreDateHoldCutoff(now);
    const released = await db
        .update(mutualMatches)
        .set({ status: "expired", updatedAt: now })
        .where(
            and(
                inArray(mutualMatches.status, [...AUTO_RELEASE_STATUSES]),
                lte(mutualMatches.updatedAt, cutoff),
            ),
        )
        .returning({ id: mutualMatches.id });

    if (released.length > 0) {
        console.log("[match-hold] auto-released stale pre-date holds", {
            count: released.length,
            cutoff: cutoff.toISOString(),
        });
    }

    return released.length;
}

/** Days a `completed` mutual stays as a hold while waiting for user feedback. Default 7. */
export function getMatchHoldFeedbackGraceDays(): number {
    const raw = Number(process.env.MATCH_HOLD_FEEDBACK_GRACE_DAYS);
    if (!Number.isFinite(raw) || raw <= 0) return 7;
    return Math.floor(raw);
}

function pickPrimaryPhoto(
    profile: typeof profiles.$inferSelect | null | undefined,
): string | null {
    if (!profile) return null;
    const photos = Array.isArray(profile.photos) ? profile.photos : null;
    return (photos?.[0] as string | undefined)
        ?? profile.profilePhoto
        ?? null;
}

/**
 * Returns the user's most-recent active hold or null. If no row gates the user, returns null.
 *
 * Note: the primary source of truth is `mutualMatches`. Legacy `dateMatches` rows that were never
 * bridged into `mutualMatches` are intentionally ignored — admins reconcile those.
 */
export async function getActiveMatchHoldForUser(userId: string): Promise<MatchHold | null> {
    await releaseStalePreDateMatchHoldsForUser(userId);

    const rows = await readDb
        .select()
        .from(mutualMatches)
        .where(
            and(
                inArray(mutualMatches.status, [...HOLD_STATUSES]),
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
            ),
        )
        .orderBy(mutualMatches.createdAt);

    if (rows.length === 0) return null;

    const graceDays = getMatchHoldFeedbackGraceDays();
    const graceMs = graceDays * 24 * 60 * 60 * 1000;
    const now = Date.now();

    for (const row of rows) {
        const partnerUserId = row.userAId === userId ? row.userBId : row.userAId;

        if (row.status === "completed") {
            const dateMatchId = row.legacyDateMatchId ?? null;
            const feedbackRow = dateMatchId
                ? await readDb.query.dateFeedback.findFirst({
                    where: and(
                        eq(dateFeedback.dateMatchId, dateMatchId),
                        eq(dateFeedback.userId, userId),
                    ),
                })
                : null;

            const completedAtMs = row.updatedAt.getTime();
            const autoReleaseMs = completedAtMs + graceMs;
            const pastGrace = now >= autoReleaseMs;

            if (feedbackRow || pastGrace) continue;

            const partnerProfile = await readDb.query.profiles.findFirst({
                where: eq(profiles.userId, partnerUserId),
            });

            return {
                mutualMatchId: row.id,
                candidatePairId: row.candidatePairId,
                partnerUserId,
                partner: {
                    firstName: partnerProfile?.firstName ?? null,
                    age: partnerProfile?.age ?? null,
                    profilePhoto: pickPrimaryPhoto(partnerProfile),
                    course: partnerProfile?.course ?? null,
                    university: partnerProfile?.university ?? null,
                },
                status: "completed_pending_feedback",
                venueName: row.venueName,
                venueAddress: row.venueAddress,
                scheduledAt: row.scheduledAt?.toISOString() ?? null,
                dateMatchId,
                needsFeedback: true,
                autoReleaseAt: new Date(autoReleaseMs).toISOString(),
                createdAt: row.createdAt.toISOString(),
            };
        }

        // Statuses: mutual, being_arranged, upcoming -> always hold.
        const partnerProfile = await readDb.query.profiles.findFirst({
            where: eq(profiles.userId, partnerUserId),
        });

        return {
            mutualMatchId: row.id,
            candidatePairId: row.candidatePairId,
            partnerUserId,
            partner: {
                firstName: partnerProfile?.firstName ?? null,
                age: partnerProfile?.age ?? null,
                profilePhoto: pickPrimaryPhoto(partnerProfile),
                course: partnerProfile?.course ?? null,
                university: partnerProfile?.university ?? null,
            },
            status: row.status as MatchHoldStatus,
            venueName: row.venueName,
            venueAddress: row.venueAddress,
            scheduledAt: row.scheduledAt?.toISOString() ?? null,
            dateMatchId: row.legacyDateMatchId ?? null,
            needsFeedback: false,
            autoReleaseAt: null,
            createdAt: row.createdAt.toISOString(),
        };
    }

    return null;
}

/**
 * Cheap "is held?" check used by gating code. Skips profile lookups.
 */
export async function isUserOnMatchHold(userId: string): Promise<boolean> {
    const cutoff = getPreDateHoldCutoff();
    const row = await readDb
        .select({ id: mutualMatches.id })
        .from(mutualMatches)
        .where(
            and(
                inArray(mutualMatches.status, [...HOLD_STATUSES]),
                or(
                    inArray(mutualMatches.status, [...DURABLE_HOLD_STATUSES]),
                    and(
                        inArray(mutualMatches.status, [...AUTO_RELEASE_STATUSES]),
                        gt(mutualMatches.updatedAt, cutoff),
                    ),
                ),
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
            ),
        )
        .limit(1);

    return row.length > 0;
}

/**
 * Move all of `userId`'s `queued` and non-mutual `active` candidate pairs to `expired` so the
 * partners on the other side can be re-matched with someone else. Returns expired count.
 *
 * Skips any pair that is currently in `mutual`, `closed`, or already `expired` status, plus any
 * pair id passed in `excludePairIds` (typically the new mutual pair the caller just produced).
 */
export async function expireQueuedPairsForUser(
    userId: string,
    options?: { excludePairIds?: string[]; reason?: string },
): Promise<number> {
    const now = new Date();
    const exclude = options?.excludePairIds ?? [];
    const reason = options?.reason ?? "match_hold_started";

    const conditions = [
        inArray(candidatePairs.status, ["queued", "active"] as const),
        or(
            eq(candidatePairs.userAId, userId),
            eq(candidatePairs.userBId, userId),
        ),
    ];
    if (exclude.length > 0) {
        conditions.push(...exclude.map((id) => ne(candidatePairs.id, id)));
    }

    const updated = await db
        .update(candidatePairs)
        .set({ status: "expired", updatedAt: now })
        .where(and(...conditions))
        .returning({ id: candidatePairs.id });

    if (updated.length > 0) {
        console.log("[match-hold] expired queued/active pairs", {
            userId,
            count: updated.length,
            reason,
        });
    }

    return updated.length;
}

/**
 * User-initiated cancellation of an active match hold. Updates the mutual to `cancelled` and any
 * linked dateMatches row to `cancelled`. Records analytics. Idempotent.
 */
export async function cancelMatchHold(
    userId: string,
    mutualMatchId: string,
    reason: MatchHoldCancelReason,
): Promise<{ status: "cancelled" | "already_cancelled" | "not_found" | "forbidden" }> {
    const row = await readDb.query.mutualMatches.findFirst({
        where: eq(mutualMatches.id, mutualMatchId),
    });

    if (!row) return { status: "not_found" };
    if (row.userAId !== userId && row.userBId !== userId) return { status: "forbidden" };
    if (row.status === "cancelled") return { status: "already_cancelled" };

    const now = new Date();

    await db.transaction(async (tx) => {
        await tx
            .update(mutualMatches)
            .set({ status: "cancelled", updatedAt: now })
            .where(eq(mutualMatches.id, mutualMatchId));

        if (row.legacyDateMatchId) {
            await tx
                .update(dateMatches)
                .set({ status: "cancelled" })
                .where(eq(dateMatches.id, row.legacyDateMatchId));
        }
    });

    void logEvent(EVENT_TYPES.DATE_REQUEST_DECLINED, userId, {
        reason: reason.reason,
        notes: reason.notes ?? null,
        mutualMatchId,
        actor: "user",
        kind: "match_hold_cancel",
    });

    console.log("[match-hold] cancelled by user", {
        userId,
        mutualMatchId,
        reason: reason.reason,
    });

    return { status: "cancelled" };
}
