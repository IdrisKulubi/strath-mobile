import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { matches, session as sessionTable } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
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

// PATCH /api/matches/[matchId]/opened - Mark match as opened
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const { matchId } = await params;
        const userId = session.user.id;

        // Find the match and verify user is part of it
        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, matchId),
                or(
                    eq(matches.user1Id, userId),
                    eq(matches.user2Id, userId)
                )
            )
        });

        if (!match) {
            return NextResponse.json(
                { success: false, error: "Match not found" },
                { status: 404 }
            );
        }

        // Mark as opened for the appropriate user
        if (match.user1Id === userId) {
            await db
                .update(matches)
                .set({ user1Opened: true, updatedAt: new Date() })
                .where(eq(matches.id, matchId));
        } else {
            await db
                .update(matches)
                .set({ user2Opened: true, updatedAt: new Date() })
                .where(eq(matches.id, matchId));
        }

        return NextResponse.json({
            success: true,
            message: "Match marked as opened"
        });

    } catch (error) {
        console.error("Error marking match as opened:", error);
        return NextResponse.json(
            { success: false, error: "Failed to mark match as opened" },
            { status: 500 }
        );
    }
}
