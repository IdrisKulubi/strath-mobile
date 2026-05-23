import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { matches, messages, mutualMatches } from "@/db/schema";
import { eq, and, or, ne, sql, inArray } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const userId = session.user.id;

        // Get count of unopened matches (matches where user hasn't opened yet)
        const unopenedMatchesResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(matches)
            .where(
                or(
                    and(eq(matches.user1Id, userId), eq(matches.user1Opened, false)),
                    and(eq(matches.user2Id, userId), eq(matches.user2Opened, false))
                )
            );

        const unopenedMatches = unopenedMatchesResult[0]?.count || 0;

        const datesAttentionResult = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(mutualMatches)
            .where(and(
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
                inArray(mutualMatches.status, ["mutual", "call_pending", "being_arranged", "upcoming"]),
            ));
        const datesAttention = datesAttentionResult[0]?.count || 0;

        // Get all matches for user to calculate unread messages
        const userMatches = await db
            .select({ id: matches.id })
            .from(matches)
            .where(
                or(
                    eq(matches.user1Id, userId),
                    eq(matches.user2Id, userId)
                )
            );

        let unreadMessages = 0;

        if (userMatches.length > 0) {
            const matchIds = userMatches.map(m => m.id);
            
            // Count unread messages across all matches (messages not from current user that are not 'read')
            const unreadResult = await db
                .select({ count: sql<number>`count(*)::int` })
                .from(messages)
                .where(
                    and(
                        inArray(messages.matchId, matchIds),
                        ne(messages.senderId, userId),
                        ne(messages.status, 'read')
                    )
                );

            unreadMessages = unreadResult[0]?.count || 0;
        }

        return successResponse({
            unopenedMatches,
            unreadMessages,
            datesAttention,
            incomingRequests: 0,
            total: unopenedMatches + unreadMessages + datesAttention,
        });

    } catch {
        return errorResponse(new Error("Failed to fetch notification counts"));
    }
}
