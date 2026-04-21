import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    dateMatches,
    messages,
    mutualMatches,
    profiles,
    vibeChecks,
} from "@/db/schema";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { isPaymentsEnabled } from "@/lib/feature-flags";
import { getPaymentWindowHours } from "@/lib/revenuecat-server";

/**
 * After a vibe call both parties say "meet", flip the `mutualMatches` row to `being_arranged` and
 * find-or-create the `dateMatches` row admins use on the Arranging queue.
 *
 * Bridge step is needed because `dateMatches` historically only got created by the legacy
 * `dateRequests` accept flow. The new candidate-pair → mutual → call flow never created one,
 * leaving the admin "Arranging" page empty.
 *
 * Idempotent: safe to call multiple times.
 */
export async function bridgeMutualToBeingArranged(input: {
    user1Id: string;
    user2Id: string;
    candidatePairId?: string | null;
}): Promise<{
    mutualMatchId: string;
    dateMatchId: string;
    created: boolean;
} | null> {
    const { user1Id, user2Id } = input;

    const mutualRow = await db.query.mutualMatches.findFirst({
        where: or(
            and(eq(mutualMatches.userAId, user1Id), eq(mutualMatches.userBId, user2Id)),
            and(eq(mutualMatches.userAId, user2Id), eq(mutualMatches.userBId, user1Id)),
        ),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    if (!mutualRow) {
        console.warn("[mutual-match] bridgeMutualToBeingArranged: no mutualMatches row", {
            user1Id,
            user2Id,
        });
        return null;
    }

    const userAId = mutualRow.userAId;
    const userBId = mutualRow.userBId;

    const existingDateMatch = await db.query.dateMatches.findFirst({
        where: or(
            and(eq(dateMatches.userAId, userAId), eq(dateMatches.userBId, userBId)),
            and(eq(dateMatches.userAId, userBId), eq(dateMatches.userBId, userAId)),
        ),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    let dateMatchId: string;
    let created = false;
    const now = new Date();

    // Payment gate (docs/payment.md §10). When `payments_enabled` is ON, both
    // users need to pay the Date Coordination Fee before admins see this pair
    // in the arranging queue. When OFF we stay on the legacy path and rows
    // continue to use the default `paymentState = 'not_required'`.
    const paymentsOn = await isPaymentsEnabled();
    const paymentState: typeof dateMatches.$inferInsert["paymentState"] = paymentsOn
        ? "awaiting_payment"
        : "not_required";
    const paymentDueBy = paymentsOn
        ? new Date(now.getTime() + getPaymentWindowHours() * 60 * 60 * 1000)
        : null;

    if (existingDateMatch) {
        dateMatchId = existingDateMatch.id;
        const stillNeedsSetup =
            existingDateMatch.status === "pending_setup" || existingDateMatch.status === "cancelled";

        const update: Partial<typeof dateMatches.$inferInsert> = {
            callCompleted: true,
            userAConfirmed: true,
            userBConfirmed: true,
        };
        if (stillNeedsSetup && existingDateMatch.status !== "pending_setup") {
            update.status = "pending_setup";
        }

        // Only open the payment window once — never roll a match that's
        // already paid / being_arranged backwards.
        if (
            paymentsOn
            && (existingDateMatch.paymentState === "not_required"
                || existingDateMatch.paymentState === null
                || existingDateMatch.paymentState === undefined)
        ) {
            update.paymentState = "awaiting_payment";
            update.paymentDueBy = paymentDueBy;
        }

        await db.update(dateMatches).set(update).where(eq(dateMatches.id, existingDateMatch.id));
    } else {
        const [inserted] = await db
            .insert(dateMatches)
            .values({
                userAId,
                userBId,
                vibe: "coffee",
                callCompleted: true,
                userAConfirmed: true,
                userBConfirmed: true,
                status: "pending_setup",
                paymentState,
                paymentDueBy,
                candidatePairId: mutualRow.candidatePairId ?? input.candidatePairId ?? null,
                createdAt: now,
            })
            .returning({ id: dateMatches.id });
        dateMatchId = inserted.id;
        created = true;
    }

    if (
        mutualRow.status !== "being_arranged"
        || mutualRow.legacyDateMatchId !== dateMatchId
    ) {
        await db
            .update(mutualMatches)
            .set({
                status: "being_arranged",
                legacyDateMatchId: dateMatchId,
                updatedAt: now,
            })
            .where(eq(mutualMatches.id, mutualRow.id));
    }

    console.log("[mutual-match] bridged to being_arranged", {
        mutualMatchId: mutualRow.id,
        dateMatchId,
        createdDateMatch: created,
        userAId,
        userBId,
    });

    return {
        mutualMatchId: mutualRow.id,
        dateMatchId,
        created,
    };
}

export type MutualDatesItem = {
    id: string;
    pairId?: string;
    source: "candidate_pair" | "legacy_date_match";
    withUser: {
        id: string;
        firstName: string;
        age?: number;
        profilePhoto?: string;
        compatibilityScore?: number;
        compatibilityReasons?: string[];
    };
    arrangementStatus: "mutual" | "call_pending" | "being_arranged" | "upcoming" | "completed" | "cancelled" | "expired";
    legacyMatchId?: string;
    legacyDateMatchId?: string;
    /** Orthogonal payment-state, only meaningful when `paymentsEnabled` is on. */
    paymentState?:
        | "not_required"
        | "awaiting_payment"
        | "paid_waiting_for_other"
        | "being_arranged"
        | "confirmed"
        | "expired"
        | "refunded";
    /** Deadline for closing the payment window; null if not in a paying state. */
    paymentDueBy?: string;
    venueName?: string;
    venueAddress?: string;
    scheduledAt?: string;
    createdAt: string;
    /**
     * Sub-state of the post-call decision flow. Drives the Dates tab UI for `call_pending`
     * mutuals so users can resume an undecided meet/pass even after the original call screen closed.
     */
    callStage?:
        | "call_ready"
        | "decision_pending_me"
        | "decision_pending_partner"
        | "decision_pending_both"
        | "completed";
    vibeCheckId?: string;
    myDecision?: "meet" | "pass" | null;
    partnerDecision?: "meet" | "pass" | null;
    callEndedAt?: string;
    /**
     * Unread messages the viewer has not read yet in the linked chat thread. Populated
     * only for items where chat is unlocked (status in `being_arranged | upcoming | completed`
     * and a `legacyMatchId` exists). Omitted otherwise.
     */
    unreadMessageCount?: number;
};

const CHAT_UNLOCKED_STATUSES: ReadonlyArray<MutualDatesItem["arrangementStatus"]> = [
    "being_arranged",
    "upcoming",
    "completed",
];

function deriveCallStage(input: {
    viewerIsUser1: boolean;
    user1Decision: "meet" | "pass" | null;
    user2Decision: "meet" | "pass" | null;
    bothAgreedToMeet: boolean;
    status: "pending" | "scheduled" | "active" | "completed" | "expired" | "cancelled";
    endedAt: Date | null;
}): {
    stage: NonNullable<MutualDatesItem["callStage"]>;
    myDecision: MutualDatesItem["myDecision"];
    partnerDecision: MutualDatesItem["partnerDecision"];
} {
    const myDecision = input.viewerIsUser1 ? input.user1Decision : input.user2Decision;
    const partnerDecision = input.viewerIsUser1 ? input.user2Decision : input.user1Decision;
    const bothDecided = !!(input.user1Decision && input.user2Decision);

    if (input.bothAgreedToMeet || (bothDecided && input.status === "completed")) {
        return { stage: "completed", myDecision, partnerDecision };
    }

    const callOver = input.status === "completed" || input.status === "expired" || input.endedAt !== null;
    if (!callOver) {
        return { stage: "call_ready", myDecision, partnerDecision };
    }

    if (!myDecision && !partnerDecision) {
        return { stage: "decision_pending_both", myDecision, partnerDecision };
    }
    if (!myDecision) {
        return { stage: "decision_pending_me", myDecision, partnerDecision };
    }
    if (!partnerDecision) {
        return { stage: "decision_pending_partner", myDecision, partnerDecision };
    }
    return { stage: "completed", myDecision, partnerDecision };
}

export function mapLegacyDateStatus(
    dm: typeof dateMatches.$inferSelect,
): MutualDatesItem["arrangementStatus"] {
    if (dm.status === "attended") return "completed";
    if (dm.status === "cancelled" || dm.status === "no_show") return "cancelled";
    if (dm.status === "scheduled") return "upcoming";

    // Payment-gated: a match sitting in `awaiting_payment` /
    // `paid_waiting_for_other` / `expired` / `refunded` is NOT ready for admin
    // arranging — users are still in the paywall flow. Keep it in the client's
    // "call_pending" bucket so the paywall UI can take over.
    const paymentState = dm.paymentState ?? "not_required";
    const paymentNotReady =
        paymentState === "awaiting_payment"
        || paymentState === "paid_waiting_for_other"
        || paymentState === "expired"
        || paymentState === "refunded";
    if (paymentNotReady) return "call_pending";

    // Match admin "Arranging" queue: only after vibe call and both users confirmed meet intent
    if (dm.callCompleted && dm.userAConfirmed && dm.userBConfirmed) return "being_arranged";
    return "call_pending";
}

export async function listMutualDatesForUser(userId: string): Promise<MutualDatesItem[]> {
    const [mutualRows, legacyRows] = await Promise.all([
        db
            .select()
            .from(mutualMatches)
            .where(
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
            )
            .orderBy(desc(mutualMatches.createdAt)),
        db
            .select()
            .from(dateMatches)
            .where(
                and(
                    or(
                        eq(dateMatches.userAId, userId),
                        eq(dateMatches.userBId, userId),
                    ),
                ),
            )
            .orderBy(desc(dateMatches.createdAt)),
    ]);

    // Build a lookup from dateMatchId -> row so we can enrich candidate-pair
    // mutuals with their linked payment state without an N+1 query.
    const dateMatchById = new Map(legacyRows.map((r) => [r.id, r]));

    const hydratedMutuals = await Promise.all(
        mutualRows.map(async (row) => {
            const otherUserId = row.userAId === userId ? row.userBId : row.userAId;
            const [profile, compatibility, latestVibeCheck] = await Promise.all([
                db.query.profiles.findFirst({
                    where: eq(profiles.userId, otherUserId),
                    with: { user: true },
                }),
                computeCompatibility(userId, otherUserId),
                row.legacyMatchId
                    ? db.query.vibeChecks.findFirst({
                          where: eq(vibeChecks.matchId, row.legacyMatchId),
                          orderBy: (v, { desc }) => [desc(v.createdAt)],
                      })
                    : Promise.resolve(undefined),
            ]);
            const primaryPhoto =
                (Array.isArray(profile?.photos) ? profile.photos[0] : null)
                ?? profile?.profilePhoto
                ?? profile?.user?.profilePhoto
                ?? profile?.user?.image
                ?? undefined;

            let callStage: MutualDatesItem["callStage"];
            let myDecision: MutualDatesItem["myDecision"];
            let partnerDecision: MutualDatesItem["partnerDecision"];
            let vibeCheckId: string | undefined;
            let callEndedAt: string | undefined;

            if (latestVibeCheck && row.status === "call_pending") {
                const viewerIsUser1 = latestVibeCheck.user1Id === userId;
                const derived = deriveCallStage({
                    viewerIsUser1,
                    user1Decision: latestVibeCheck.user1Decision ?? null,
                    user2Decision: latestVibeCheck.user2Decision ?? null,
                    bothAgreedToMeet: !!latestVibeCheck.bothAgreedToMeet,
                    status: (latestVibeCheck.status ?? "pending") as
                        | "pending"
                        | "scheduled"
                        | "active"
                        | "completed"
                        | "expired"
                        | "cancelled",
                    endedAt: latestVibeCheck.endedAt ?? null,
                });
                callStage = derived.stage;
                myDecision = derived.myDecision;
                partnerDecision = derived.partnerDecision;
                vibeCheckId = latestVibeCheck.id;
                callEndedAt = latestVibeCheck.endedAt?.toISOString();
            }

            const linkedDateMatch = row.legacyDateMatchId
                ? dateMatchById.get(row.legacyDateMatchId)
                : undefined;

            return {
                id: row.id,
                pairId: row.candidatePairId,
                source: "candidate_pair" as const,
                withUser: {
                    id: otherUserId,
                    firstName: profile?.firstName ?? profile?.user?.name?.split(" ")[0] ?? "Unknown",
                    age: profile?.age ?? 0,
                    profilePhoto: primaryPhoto,
                    compatibilityScore: compatibility.score,
                    compatibilityReasons: compatibility.reasons,
                },
                arrangementStatus: row.status,
                legacyMatchId: row.legacyMatchId ?? undefined,
                legacyDateMatchId: row.legacyDateMatchId ?? undefined,
                paymentState: linkedDateMatch?.paymentState ?? undefined,
                paymentDueBy: linkedDateMatch?.paymentDueBy?.toISOString() ?? undefined,
                venueName: row.venueName ?? undefined,
                venueAddress: row.venueAddress ?? undefined,
                scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
                createdAt: row.createdAt.toISOString(),
                callStage,
                vibeCheckId,
                myDecision,
                partnerDecision,
                callEndedAt,
            };
        }),
    );

    const bridgedLegacyIds = new Set(
        mutualRows
            .map((row) => row.legacyDateMatchId)
            .filter((id): id is string => Boolean(id)),
    );

    const hydratedLegacy = await Promise.all(
        legacyRows
            .filter((row) => !bridgedLegacyIds.has(row.id))
            .map(async (row) => {
                const otherUserId = row.userAId === userId ? row.userBId : row.userAId;
                const [profile, compatibility] = await Promise.all([
                    db.query.profiles.findFirst({
                        where: eq(profiles.userId, otherUserId),
                        with: { user: true },
                    }),
                    computeCompatibility(userId, otherUserId),
                ]);
                const primaryPhoto =
                    (Array.isArray(profile?.photos) ? profile.photos[0] : null)
                    ?? profile?.profilePhoto
                    ?? profile?.user?.profilePhoto
                    ?? profile?.user?.image
                    ?? undefined;

                return {
                    id: row.id,
                    source: "legacy_date_match" as const,
                    withUser: {
                        id: otherUserId,
                        firstName: profile?.firstName ?? profile?.user?.name?.split(" ")[0] ?? "Unknown",
                        age: profile?.age ?? 0,
                        profilePhoto: primaryPhoto,
                        compatibilityScore: compatibility.score,
                        compatibilityReasons: compatibility.reasons,
                    },
                    arrangementStatus: mapLegacyDateStatus(row),
                    legacyDateMatchId: row.id,
                    paymentState: row.paymentState ?? undefined,
                    paymentDueBy: row.paymentDueBy?.toISOString() ?? undefined,
                    venueName: row.venueName ?? undefined,
                    venueAddress: row.venueAddress ?? undefined,
                    scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
                    createdAt: row.createdAt.toISOString(),
                };
            }),
    );

    const combined: MutualDatesItem[] = [...hydratedMutuals, ...hydratedLegacy].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    // Populate unread message counts for every item with chat unlocked. One grouped
    // query covers all matches in the list. Pattern mirrors /api/matches/route.ts.
    const chatUnlockedLegacyIds = combined
        .filter((item) =>
            CHAT_UNLOCKED_STATUSES.includes(item.arrangementStatus)
            && !!item.legacyMatchId,
        )
        .map((item) => item.legacyMatchId as string);

    if (chatUnlockedLegacyIds.length > 0) {
        const rows = await db
            .select({
                matchId: messages.matchId,
                count: sql<number>`count(*)::int`,
            })
            .from(messages)
            .where(
                and(
                    inArray(messages.matchId, chatUnlockedLegacyIds),
                    ne(messages.senderId, userId),
                    ne(messages.status, "read"),
                ),
            )
            .groupBy(messages.matchId);

        const unreadByMatch = new Map<string, number>(
            rows.map((r) => [r.matchId, Number(r.count) || 0]),
        );

        for (const item of combined) {
            if (
                item.legacyMatchId
                && CHAT_UNLOCKED_STATUSES.includes(item.arrangementStatus)
            ) {
                item.unreadMessageCount = unreadByMatch.get(item.legacyMatchId) ?? 0;
            }
        }
    }

    return combined;
}
