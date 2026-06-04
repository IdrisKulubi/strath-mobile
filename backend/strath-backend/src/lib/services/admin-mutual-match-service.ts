import { and, eq, inArray, or } from "drizzle-orm";

import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import { candidatePairs, dateMatches, mutualMatches, profiles, user } from "@/db/schema";
import {
    MANUAL_CURATED_PAIR_EXPIRES_AT,
    canonicalizePairUsers,
    recordCandidatePairHistory,
} from "@/lib/services/candidate-pairs-service";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { ensureLegacyMatch } from "@/lib/services/legacy-match-service";
import { expireQueuedPairsForUser } from "@/lib/services/match-hold-service";
import { assignMeetupSlot } from "@/lib/services/meetup-slot-service";
import { getPaymentsEnabled } from "@/lib/payments/payment-flags";
import { buildDateMatchPaymentInsert } from "@/lib/payments/payment-init";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

const BUSY_PAIR_STATUSES = ["active", "queued", "mutual"] as const;
const HOLD_MUTUAL_STATUSES = ["mutual", "being_arranged", "upcoming"] as const;

export type AdminMutualMatchResult =
    | { ok: true; pairId: string; mutualMatchId: string; dateMatchId: string }
    | { ok: false; error: string; hint?: string };

async function notifyMutualMatchPushes(input: {
    pairId: string;
    userAId: string;
    userBId: string;
}) {
    const [userA, userB, profileA, profileB] = await Promise.all([
        readDb.query.user.findFirst({ where: eq(user.id, input.userAId) }),
        readDb.query.user.findFirst({ where: eq(user.id, input.userBId) }),
        readDb.query.profiles.findFirst({ where: eq(profiles.userId, input.userAId) }),
        readDb.query.profiles.findFirst({ where: eq(profiles.userId, input.userBId) }),
    ]);

    const nameA = profileA?.firstName || userA?.name?.split(" ")[0] || "Someone";
    const nameB = profileB?.firstName || userB?.name?.split(" ")[0] || "Someone";

    await Promise.all([
        userA?.pushToken
            ? sendPushNotification(userA.pushToken, {
                  title: "It's mutual",
                  body: `You and ${nameB} are both interested`,
                  data: {
                      type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                      pairId: input.pairId,
                      userId: input.userBId,
                  },
              })
            : Promise.resolve(),
        userB?.pushToken
            ? sendPushNotification(userB.pushToken, {
                  title: "It's mutual",
                  body: `You and ${nameA} are both interested`,
                  data: {
                      type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                      pairId: input.pairId,
                      userId: input.userAId,
                  },
              })
            : Promise.resolve(),
    ]);
}

export async function createAdminMutualMatchBetweenUsers(input: {
    userAId: string;
    userBId: string;
    adminUserId: string;
    note?: string;
    forceReleaseHolds?: boolean;
    blockReason: string | null;
}): Promise<AdminMutualMatchResult> {
    const { userAId, userBId } = input;
    const releaseHoldHint =
        'Turn on "Release current hold" under match options, then try again.';

    if (input.blockReason && !input.forceReleaseHolds) {
        return {
            ok: false,
            error: input.blockReason,
            hint: releaseHoldHint,
        };
    }

    const { userAId: canonicalAId, userBId: canonicalBId } = canonicalizePairUsers(userAId, userBId);
    const compatibility = await computeCompatibility(canonicalAId, canonicalBId);
    const now = new Date();
    const expiresAt = MANUAL_CURATED_PAIR_EXPIRES_AT;
    const adminNote = input.note?.trim() || "Admin created mutual match";
    const assignment = assignMeetupSlot(now);
    const paymentsEnabled = await getPaymentsEnabled();
    const paymentFields = buildDateMatchPaymentInsert({
        confirmBy: assignment.confirmBy,
        enabled: paymentsEnabled,
    });

    const created = await db.transaction(async (tx) => {
        if (input.forceReleaseHolds) {
            const holds = await tx.query.mutualMatches.findMany({
                where: and(
                    or(
                        and(eq(mutualMatches.userAId, userAId), eq(mutualMatches.userBId, userBId)),
                        and(eq(mutualMatches.userAId, userBId), eq(mutualMatches.userBId, userAId)),
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
            const linkedMutual = await tx.query.mutualMatches.findFirst({
                where: eq(mutualMatches.candidatePairId, existing.id),
            });
            if (
                linkedMutual &&
                (HOLD_MUTUAL_STATUSES as readonly string[]).includes(linkedMutual.status)
            ) {
                await tx
                    .update(mutualMatches)
                    .set({ status: "cancelled", updatedAt: now })
                    .where(eq(mutualMatches.id, linkedMutual.id));
                if (linkedMutual.legacyDateMatchId) {
                    await tx
                        .update(dateMatches)
                        .set({ status: "cancelled" })
                        .where(eq(dateMatches.id, linkedMutual.legacyDateMatchId));
                }
            }

            await tx
                .update(candidatePairs)
                .set({ status: "closed", updatedAt: now })
                .where(eq(candidatePairs.id, existing.id));

            await recordCandidatePairHistory(tx, {
                pairId: existing.id,
                actorUserId: input.adminUserId,
                eventType: "closed",
                fromStatus: existing.status,
                toStatus: "closed",
                metadata: {
                    source: "admin_mutual",
                    reason: "superseded_by_admin_mutual_match",
                    adminUserId: input.adminUserId,
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
                aDecision: "open_to_meet",
                bDecision: "open_to_meet",
                status: "mutual",
                expiresAt,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        await recordCandidatePairHistory(tx, {
            pairId: pair.id,
            actorUserId: input.adminUserId,
            eventType: "generated",
            toStatus: "active",
            metadata: {
                source: "admin_mutual",
                adminUserId: input.adminUserId,
                userAId,
                userBId,
                note: adminNote,
            },
        });

        await recordCandidatePairHistory(tx, {
            pairId: pair.id,
            actorUserId: input.adminUserId,
            eventType: "mutual",
            fromStatus: "active",
            toStatus: "mutual",
            metadata: {
                source: "admin_mutual",
                adminUserId: input.adminUserId,
                aDecision: "open_to_meet",
                bDecision: "open_to_meet",
                note: adminNote,
            },
        });

        const legacyMatch = await ensureLegacyMatch(tx, canonicalAId, canonicalBId);

        const [mutual] = await tx
            .insert(mutualMatches)
            .values({
                candidatePairId: pair.id,
                userAId: canonicalAId,
                userBId: canonicalBId,
                status: "mutual",
                legacyMatchId: legacyMatch.id,
                scheduledAt: assignment.scheduledAt,
                slotConfirmBy: assignment.confirmBy,
                assignedSlot: assignment.slot,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        const [dateMatch] = await tx
            .insert(dateMatches)
            .values({
                candidatePairId: pair.id,
                userAId: canonicalAId,
                userBId: canonicalBId,
                vibe: "coffee",
                status: "pending_setup",
                scheduledAt: assignment.scheduledAt,
                callCompleted: false,
                userAConfirmed: false,
                userBConfirmed: false,
                createdAt: now,
                ...paymentFields,
            })
            .returning({ id: dateMatches.id });

        await tx
            .update(mutualMatches)
            .set({ legacyDateMatchId: dateMatch.id, updatedAt: now })
            .where(eq(mutualMatches.id, mutual.id));

        return {
            pairId: pair.id,
            mutualMatchId: mutual.id,
            dateMatchId: dateMatch.id,
            userAId: canonicalAId,
            userBId: canonicalBId,
        };
    });

    await Promise.all([
        expireQueuedPairsForUser(created.userAId, {
            excludePairIds: [created.pairId],
            reason: "mutual_created",
        }),
        expireQueuedPairsForUser(created.userBId, {
            excludePairIds: [created.pairId],
            reason: "mutual_created",
        }),
    ]);

    await notifyMutualMatchPushes({
        pairId: created.pairId,
        userAId: created.userAId,
        userBId: created.userBId,
    });

    const { sendMeetupSlotAssignedPushes } = await import(
        "@/lib/services/meetup-push-notifications-service"
    );
    await sendMeetupSlotAssignedPushes({
        userAId: created.userAId,
        userBId: created.userBId,
        scheduledAt: assignment.scheduledAt,
        confirmBy: assignment.confirmBy,
        paymentsEnabled,
        dateMatchId: created.dateMatchId,
    }).catch((err) => {
        console.warn("[admin-mutual-match] meetup slot push failed", err);
    });

    return {
        ok: true,
        pairId: created.pairId,
        mutualMatchId: created.mutualMatchId,
        dateMatchId: created.dateMatchId,
    };
}
