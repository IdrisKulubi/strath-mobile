import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, messages } from "@/db/schema";
import { eq, or, and, desc, lt, sql } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

const DEFAULT_LIMIT = 20;

export async function GET(req: NextRequest) {
    try {
        const session = await auth.api.getSession({ headers: req.headers });
        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const userId = session.user.id;
        const { searchParams } = new URL(req.url);
        const cursor = searchParams.get("cursor");
        const limit = Math.min(
            parseInt(searchParams.get("limit") || String(DEFAULT_LIMIT)),
            50 // Max limit to prevent abuse
        );

        // Build where clause with optional cursor for pagination
        let whereClause = or(
            eq(matches.user1Id, userId),
            eq(matches.user2Id, userId)
        );

        if (cursor) {
            const cursorDate = new Date(cursor);
            whereClause = and(
                whereClause,
                lt(matches.lastMessageAt, cursorDate)
            );
        }

        // Fetch matches with related data
        const userMatches = await db.query.matches.findMany({
            where: whereClause,
            orderBy: [desc(matches.lastMessageAt), desc(matches.createdAt)],
            limit: limit + 1, // Fetch one extra to check if there's more
            with: {
                user1: {
                    with: {
                        profile: true,
                    },
                },
                user2: {
                    with: {
                        profile: true,
                    },
                },
                messages: {
                    limit: 1,
                    orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                },
            },
        });

        // Check if there are more results
        const hasMore = userMatches.length > limit;
        const matchesToReturn = hasMore ? userMatches.slice(0, limit) : userMatches;

        // Get unread counts for each match
        const matchIds = matchesToReturn.map((m) => m.id);

        // Query unread counts efficiently in a single query
        const unreadCounts = matchIds.length > 0
            ? await db
                .select({
                    matchId: messages.matchId,
                    count: sql<number>`count(*)::int`,
                })
                .from(messages)
                .where(
                    and(
                        sql`${messages.matchId} IN (${sql.raw(matchIds.map(id => `'${id}'`).join(','))})`,
                        sql`${messages.senderId} != ${userId}`,
                        sql`${messages.status} != 'read'`
                    )
                )
                .groupBy(messages.matchId)
            : [];

        // Create a map for quick lookup
        const unreadMap = new Map(
            unreadCounts.map((uc) => [uc.matchId, uc.count])
        );

        // Format matches for frontend
        const formattedMatches = matchesToReturn.map((match) => {
            const isUser1 = match.user1Id === userId;
            const partner = isUser1 ? match.user2 : match.user1;

            return {
                id: match.id,
                partner: {
                    id: partner.id,
                    name: partner.name,
                    image: partner.image,
                    profile: partner.profile,
                },
                lastMessage: match.messages[0] || null,
                unreadCount: unreadMap.get(match.id) || 0,
                createdAt: match.createdAt.toISOString(),
            };
        });

        // Determine next cursor
        const nextCursor = hasMore && matchesToReturn.length > 0
            ? matchesToReturn[matchesToReturn.length - 1].lastMessageAt?.toISOString() ||
            matchesToReturn[matchesToReturn.length - 1].createdAt.toISOString()
            : null;

        return successResponse({
            matches: formattedMatches,
            nextCursor,
        });
    } catch (error) {
        console.error("Matches API error:", error);
        return errorResponse(error);
    }
}
