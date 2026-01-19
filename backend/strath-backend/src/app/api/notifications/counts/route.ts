import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches, messages, session as sessionTable } from "@/db/schema";
import { eq, and, or, ne, sql, inArray } from "drizzle-orm";
import { auth } from "@/lib/auth";

// Helper to get session with Bearer token fallback
async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    // Fallback: Manual token check if getSession fails (for Bearer token auth from mobile)
    if (!session) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true }
            });

            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
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

        return NextResponse.json({
            success: true,
            data: {
                unopenedMatches,
                unreadMessages,
                // Combined count for a single badge if needed
                total: unopenedMatches + unreadMessages,
            }
        });

    } catch (error) {
        console.error("Error fetching notification counts:", error);
        return NextResponse.json(
            { success: false, error: "Failed to fetch notification counts" },
            { status: 500 }
        );
    }
}
