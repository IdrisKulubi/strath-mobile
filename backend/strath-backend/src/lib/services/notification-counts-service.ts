import { and, eq, gt, inArray, isNotNull, ne, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { matches, messages, mutualMatches, swipes } from "@/db/schema";
import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";
import { buildSlotConfirmationView } from "@/lib/services/meetup-confirmation-service";

export interface NotificationCountsResult {
    unopenedMatches: number;
    unreadMessages: number;
    incomingLikes: number;
    datesAttention: number;
    slotConfirmPending: number;
    partnerWaitingOnYou: number;
    rescheduleNeedsResponse: number;
    homeAttention: number;
    datesActionable: number;
    total: number;
}

async function countUnopenedMatches(userId: string): Promise<number> {
    const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(matches)
        .where(
            or(
                and(eq(matches.user1Id, userId), eq(matches.user1Opened, false)),
                and(eq(matches.user2Id, userId), eq(matches.user2Opened, false)),
            ),
        );
    return result[0]?.count ?? 0;
}

async function countDatesAttention(userId: string): Promise<number> {
    const result = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(mutualMatches)
        .where(
            and(
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
                inArray(mutualMatches.status, ["mutual", "being_arranged", "upcoming"]),
            ),
        );
    return result[0]?.count ?? 0;
}

async function countSlotAttention(userId: string): Promise<{
    slotConfirmPending: number;
    partnerWaitingOnYou: number;
}> {
    const now = new Date();
    const rows = await db.query.mutualMatches.findMany({
        where: and(
            or(
                eq(mutualMatches.userAId, userId),
                eq(mutualMatches.userBId, userId),
            ),
            inArray(mutualMatches.status, ["mutual", "being_arranged"]),
            isNotNull(mutualMatches.scheduledAt),
            isNotNull(mutualMatches.slotConfirmBy),
            gt(mutualMatches.slotConfirmBy, now),
        ),
    });

    let slotConfirmPending = 0;
    let partnerWaitingOnYou = 0;

    for (const row of rows) {
        const slot = buildSlotConfirmationView(row, userId);
        if (!slot.needsSlotConfirmation || !slot.confirmWindowOpen) continue;

        if (!slot.viewerSlotConfirmed) {
            slotConfirmPending += 1;
            if (slot.partnerSlotConfirmed) {
                partnerWaitingOnYou += 1;
            }
        }
    }

    return { slotConfirmPending, partnerWaitingOnYou };
}

async function countRescheduleNeedsResponse(userId: string): Promise<number> {
    const rescheduleEnabled = await isFeatureEnabled(
        APP_FEATURE_KEYS.rescheduleEnabled,
        false,
    );
    if (!rescheduleEnabled) return 0;

    const rows = await db.query.mutualMatches.findMany({
        where: and(
            or(eq(mutualMatches.userAId, userId), eq(mutualMatches.userBId, userId)),
            inArray(mutualMatches.status, ["mutual", "being_arranged", "upcoming"]),
            isNotNull(mutualMatches.pendingRescheduleRequestId),
        ),
        with: {
            pendingRescheduleRequest: true,
        },
    });

    let count = 0;
    for (const row of rows) {
        const pending = row.pendingRescheduleRequest;
        if (pending?.status === "pending" && pending.requestedByUserId !== userId) {
            count += 1;
        }
    }
    return count;
}

async function countUnreadMessages(userId: string): Promise<number> {
    const userMatches = await db
        .select({ id: matches.id })
        .from(matches)
        .where(
            or(
                eq(matches.user1Id, userId),
                eq(matches.user2Id, userId),
            ),
        );

    if (userMatches.length === 0) return 0;

    const matchIds = userMatches.map((m) => m.id);
    const unreadResult = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(messages)
        .where(
            and(
                inArray(messages.matchId, matchIds),
                ne(messages.senderId, userId),
                ne(messages.status, "read"),
            ),
        );

    return unreadResult[0]?.count ?? 0;
}

async function countIncomingLikes(userId: string): Promise<number> {
    const incomingLikes = await db.query.swipes.findMany({
        where: and(eq(swipes.swipedId, userId), eq(swipes.isLike, true)),
        columns: { id: true, swiperId: true },
        limit: 50,
    });

    if (incomingLikes.length === 0) return 0;

    const swiperIds = Array.from(new Set(incomingLikes.map((s) => s.swiperId)));

    const existingMatches = await db.query.matches.findMany({
        where: or(
            and(eq(matches.user1Id, userId), inArray(matches.user2Id, swiperIds)),
            and(eq(matches.user2Id, userId), inArray(matches.user1Id, swiperIds)),
        ),
        columns: { user1Id: true, user2Id: true },
        limit: 200,
    });

    const matchedPartnerIds = new Set<string>();
    for (const match of existingMatches) {
        const partnerId = match.user1Id === userId ? match.user2Id : match.user1Id;
        matchedPartnerIds.add(partnerId);
    }

    const myResponses = await db.query.swipes.findMany({
        where: and(eq(swipes.swiperId, userId), inArray(swipes.swipedId, swiperIds)),
        columns: { swipedId: true },
        limit: 200,
    });

    const respondedIds = new Set(myResponses.map((response) => response.swipedId));

    return incomingLikes.filter(
        (like) => !matchedPartnerIds.has(like.swiperId) && !respondedIds.has(like.swiperId),
    ).length;
}

export async function getNotificationCountsForUser(
    userId: string,
): Promise<NotificationCountsResult> {
    const [unopenedMatches, datesAttention, slotAttention, rescheduleNeedsResponse, unreadMessages, incomingLikes] =
        await Promise.all([
            countUnopenedMatches(userId),
            countDatesAttention(userId),
            countSlotAttention(userId),
            countRescheduleNeedsResponse(userId),
            countUnreadMessages(userId),
            countIncomingLikes(userId),
        ]);

    const { slotConfirmPending, partnerWaitingOnYou } = slotAttention;
    const homeAttention =
        unopenedMatches + (slotConfirmPending > 0 ? 1 : 0) + (rescheduleNeedsResponse > 0 ? 1 : 0);
    const datesActionable =
        slotConfirmPending + partnerWaitingOnYou + rescheduleNeedsResponse;
    const totalActionable =
        unopenedMatches + unreadMessages + datesActionable;

    return {
        unopenedMatches,
        unreadMessages,
        incomingLikes,
        datesAttention,
        slotConfirmPending,
        partnerWaitingOnYou,
        rescheduleNeedsResponse,
        homeAttention,
        datesActionable,
        total: totalActionable,
    };
}
