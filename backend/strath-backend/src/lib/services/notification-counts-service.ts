import { and, eq, gt, inArray, isNotNull, ne, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { matches, messages, mutualMatches } from "@/db/schema";
import { buildSlotConfirmationView } from "@/lib/services/meetup-confirmation-service";

export interface NotificationCountsResult {
    unopenedMatches: number;
    unreadMessages: number;
    datesAttention: number;
    slotConfirmPending: number;
    partnerWaitingOnYou: number;
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

export async function getNotificationCountsForUser(
    userId: string,
): Promise<NotificationCountsResult> {
    const [unopenedMatches, datesAttention, slotAttention, unreadMessages] = await Promise.all([
        countUnopenedMatches(userId),
        countDatesAttention(userId),
        countSlotAttention(userId),
        countUnreadMessages(userId),
    ]);

    const { slotConfirmPending, partnerWaitingOnYou } = slotAttention;
    const homeAttention = unopenedMatches + (slotConfirmPending > 0 ? 1 : 0);
    const datesActionable = slotConfirmPending + partnerWaitingOnYou;
    const totalActionable =
        unopenedMatches + unreadMessages + datesActionable;

    return {
        unopenedMatches,
        unreadMessages,
        datesAttention,
        slotConfirmPending,
        partnerWaitingOnYou,
        homeAttention,
        datesActionable,
        total: totalActionable,
    };
}
