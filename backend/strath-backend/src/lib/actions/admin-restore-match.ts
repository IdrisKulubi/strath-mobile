"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import {
    candidatePairHistory,
    candidatePairs,
    dateMatches,
    mutualMatches,
    profiles,
    user,
} from "@/db/schema";
import {
    MANUAL_CURATED_PAIR_EXPIRES_AT,
    canonicalizePairUsers,
    recordCandidatePairHistory,
} from "@/lib/services/candidate-pairs-service";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { resolveMatchExcludedUserIds } from "@/lib/services/match-exclusion-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

const BUSY_PAIR_STATUSES = ["active", "queued", "mutual"] as const;
const HOLD_MUTUAL_STATUSES = ["mutual", "being_arranged", "upcoming"] as const;

export type RestoreMatchUserResult = {
    id: string;
    name: string;
    email: string | null;
    profilePhoto: string | null;
};

export type RestoreMatchHistoryRow = {
    pairId: string;
    partner: RestoreMatchUserResult;
    pairStatus: string;
    aDecision: string;
    bDecision: string;
    endedReason: string;
    updatedAt: string;
    mutualMatchId: string | null;
    mutualStatus: string | null;
    canRestore: boolean;
    blockReason: string | null;
};

function displayName(
    profile: { firstName?: string | null; lastName?: string | null } | null,
    fallback: string,
) {
    if (!profile) return fallback;
    return [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || fallback;
}

async function loadUserSummary(userId: string): Promise<RestoreMatchUserResult | null> {
    const profile = await readDb.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
        with: { user: true },
    });
    const account = profile?.user ?? (await readDb.query.user.findFirst({ where: eq(user.id, userId) }));
    if (!account) return null;

    return {
        id: userId,
        name: displayName(profile ?? null, account.name ?? "User"),
        email: account.email ?? null,
        profilePhoto: profile?.profilePhoto ?? account.profilePhoto ?? account.image ?? null,
    };
}

function describeEndedReason(input: {
    pairStatus: string;
    anchorUserId: string;
    userAId: string;
    aDecision: string;
    bDecision: string;
    mutualStatus: string | null;
}): string {
    if (input.mutualStatus === "cancelled") {
        return "Mutual match was cancelled";
    }
    if (input.pairStatus === "expired") {
        return "Intro expired";
    }
    const anchorIsA = input.userAId === input.anchorUserId;
    const anchorDecision = anchorIsA ? input.aDecision : input.bDecision;
    const partnerDecision = anchorIsA ? input.bDecision : input.aDecision;

    if (anchorDecision === "passed") {
        return "This user passed";
    }
    if (partnerDecision === "passed") {
        return "The other person passed";
    }
    if (input.pairStatus === "closed") {
        return "Intro closed";
    }
    return input.pairStatus.replace(/_/g, " ");
}

async function getBlockingReasonBetweenUsers(
    userAId: string,
    userBId: string,
): Promise<string | null> {
    const { userAId: canonicalA, userBId: canonicalB } = canonicalizePairUsers(userAId, userBId);

    const busyPair = await readDb.query.candidatePairs.findFirst({
        where: and(
            eq(candidatePairs.userAId, canonicalA),
            eq(candidatePairs.userBId, canonicalB),
            inArray(candidatePairs.status, [...BUSY_PAIR_STATUSES]),
        ),
    });
    if (busyPair) {
        return `Active candidate pair already exists (${busyPair.status})`;
    }

    const hold = await readDb.query.mutualMatches.findFirst({
        where: and(
            or(
                and(eq(mutualMatches.userAId, userAId), eq(mutualMatches.userBId, userBId)),
                and(eq(mutualMatches.userAId, userBId), eq(mutualMatches.userBId, userAId)),
            ),
            inArray(mutualMatches.status, [...HOLD_MUTUAL_STATUSES]),
        ),
    });
    if (hold) {
        return `They already have an in-flight date (${hold.status.replace(/_/g, " ")})`;
    }

    return null;
}

export async function searchUsersForRestoreMatch(
    query: string,
): Promise<RestoreMatchUserResult[]> {
    await requireAdmin();

    const trimmed = query.trim();
    if (trimmed.length < 2) {
        return [];
    }

    const pattern = `%${trimmed}%`;
    const rows = await readDb
        .select({
            userId: profiles.userId,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            profilePhoto: profiles.profilePhoto,
            name: user.name,
            email: user.email,
            image: user.image,
        })
        .from(profiles)
        .innerJoin(user, eq(user.id, profiles.userId))
        .where(
            and(
                or(ilike(user.name, pattern), ilike(user.email, pattern), ilike(profiles.firstName, pattern)),
                sql`${user.deletedAt} IS NULL`,
            ),
        )
        .orderBy(desc(user.lastActive))
        .limit(20);

    return rows.map((row) => ({
        id: row.userId,
        name: displayName(row, row.name ?? "User"),
        email: row.email,
        profilePhoto: row.profilePhoto ?? row.image,
    }));
}

export async function getRestoreMatchHistoryForUser(
    userId: string,
): Promise<{ user: RestoreMatchUserResult; history: RestoreMatchHistoryRow[] }> {
    await requireAdmin();

    const anchor = await loadUserSummary(userId);
    if (!anchor) {
        throw new Error("User not found");
    }

    const pairs = await readDb.query.candidatePairs.findMany({
        where: or(eq(candidatePairs.userAId, userId), eq(candidatePairs.userBId, userId)),
        orderBy: [desc(candidatePairs.updatedAt)],
        limit: 80,
    });

    const relevant = pairs.filter((pair) => {
        if (pair.status === "closed" || pair.status === "expired") return true;
        if (pair.aDecision === "passed" || pair.bDecision === "passed") return true;
        return false;
    });

    const pairIds = relevant.map((p) => p.id);
    const mutualRows =
        pairIds.length > 0
            ? await readDb.query.mutualMatches.findMany({
                  where: inArray(mutualMatches.candidatePairId, pairIds),
              })
            : [];

    const mutualByPairId = new Map(mutualRows.map((m) => [m.candidatePairId, m]));

    const history: RestoreMatchHistoryRow[] = [];

    for (const pair of relevant.slice(0, 40)) {
        const partnerId = pair.userAId === userId ? pair.userBId : pair.userAId;
        const partner = await loadUserSummary(partnerId);
        if (!partner) continue;

        const mutual = mutualByPairId.get(pair.id) ?? null;
        const blockReason = await getBlockingReasonBetweenUsers(userId, partnerId);

        history.push({
            pairId: pair.id,
            partner,
            pairStatus: pair.status,
            aDecision: pair.aDecision,
            bDecision: pair.bDecision,
            endedReason: describeEndedReason({
                pairStatus: pair.status,
                anchorUserId: userId,
                userAId: pair.userAId,
                aDecision: pair.aDecision,
                bDecision: pair.bDecision,
                mutualStatus: mutual?.status ?? null,
            }),
            updatedAt: pair.updatedAt.toISOString(),
            mutualMatchId: mutual?.id ?? null,
            mutualStatus: mutual?.status ?? null,
            canRestore: blockReason === null,
            blockReason,
        });
    }

    return { user: anchor, history };
}

export async function adminRestoreMatchBetweenUsers(input: {
    anchorUserId: string;
    partnerUserId: string;
    note?: string;
    /** Close in-flight mutual/date hold before creating a fresh intro. */
    forceReleaseHolds?: boolean;
}): Promise<{ pairId: string }> {
    const session = await requireAdmin();

    const { anchorUserId, partnerUserId } = input;
    if (!anchorUserId || !partnerUserId || anchorUserId === partnerUserId) {
        throw new Error("Choose two different users");
    }

    const excluded = await resolveMatchExcludedUserIds();
    if (excluded.has(anchorUserId) || excluded.has(partnerUserId)) {
        throw new Error("Staff or admin accounts cannot be matched");
    }

    const blockReason = await getBlockingReasonBetweenUsers(anchorUserId, partnerUserId);
    if (blockReason && !input.forceReleaseHolds) {
        throw new Error(`${blockReason}. Enable "Release current hold" to replace it.`);
    }

    const { userAId: canonicalAId, userBId: canonicalBId } = canonicalizePairUsers(
        anchorUserId,
        partnerUserId,
    );
    const compatibility = await computeCompatibility(canonicalAId, canonicalBId);
    const now = new Date();
    const expiresAt = MANUAL_CURATED_PAIR_EXPIRES_AT;
    const adminNote = input.note?.trim() || "Admin restored intro after mistaken pass or cancel";

    const created = await db.transaction(async (tx) => {
        if (input.forceReleaseHolds) {
            const holds = await tx.query.mutualMatches.findMany({
                where: and(
                    or(
                        and(
                            eq(mutualMatches.userAId, anchorUserId),
                            eq(mutualMatches.userBId, partnerUserId),
                        ),
                        and(
                            eq(mutualMatches.userAId, partnerUserId),
                            eq(mutualMatches.userBId, anchorUserId),
                        ),
                    ),
                    inArray(mutualMatches.status, [...HOLD_MUTUAL_STATUSES]),
                ),
            });

            for (const hold of holds) {
                await tx
                    .update(mutualMatches)
                    .set({ status: "cancelled", updatedAt: now })
                    .where(eq(mutualMatches.id, hold.id));

                if (hold.legacyDateMatchId) {
                    await tx
                        .update(dateMatches)
                        .set({ status: "cancelled" })
                        .where(eq(dateMatches.id, hold.legacyDateMatchId));
                }

                if (hold.candidatePairId) {
                    await tx
                        .update(candidatePairs)
                        .set({ status: "closed", updatedAt: now })
                        .where(eq(candidatePairs.id, hold.candidatePairId));
                }
            }
        }

        const busyPairs = await tx.query.candidatePairs.findMany({
            where: and(
                eq(candidatePairs.userAId, canonicalAId),
                eq(candidatePairs.userBId, canonicalBId),
                inArray(candidatePairs.status, [...BUSY_PAIR_STATUSES]),
            ),
        });

        for (const existing of busyPairs) {
            await tx
                .update(candidatePairs)
                .set({ status: "closed", updatedAt: now })
                .where(eq(candidatePairs.id, existing.id));

            await recordCandidatePairHistory(tx, {
                pairId: existing.id,
                actorUserId: session.user.id,
                eventType: "closed",
                fromStatus: existing.status,
                toStatus: "closed",
                metadata: {
                    source: "admin_restore",
                    reason: "superseded_by_admin_restore",
                    adminUserId: session.user.id,
                    note: adminNote,
                },
            });
        }

        const [pair] = await tx
            .insert(candidatePairs)
            .values({
                userAId: canonicalAId,
                userBId: canonicalBId,
                compatibilityScore: compatibility.score,
                matchReasons: compatibility.reasons,
                shownToAAt: now,
                shownToBAt: now,
                aDecision: "pending",
                bDecision: "pending",
                status: "active",
                expiresAt,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        await recordCandidatePairHistory(tx, {
            pairId: pair.id,
            actorUserId: session.user.id,
            eventType: "generated",
            toStatus: "active",
            metadata: {
                source: "admin_restore",
                adminUserId: session.user.id,
                anchorUserId,
                partnerUserId,
                note: adminNote,
                forceReleaseHolds: Boolean(input.forceReleaseHolds),
            },
        });

        return pair;
    });

    const tokens = await readDb
        .select({ pushToken: user.pushToken })
        .from(user)
        .where(inArray(user.id, [canonicalAId, canonicalBId]));

    await Promise.all(
        tokens
            .filter((row) => row.pushToken)
            .map((row) =>
                sendPushNotification(row.pushToken!, {
                    title: "Someone is back on your radar",
                    body: "Open StrathSpace to see your updated intro.",
                    data: {
                        type: NOTIFICATION_TYPES.NEW_CANDIDATE_MATCH,
                        pairId: created.id,
                        route: "/(tabs)",
                    },
                }),
            ),
    );

    revalidatePath("/admin/restore-match");
    revalidatePath("/admin/matchmaking");

    return { pairId: created.id };
}
