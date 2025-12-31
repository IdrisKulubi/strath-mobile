import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { messages, matches } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq, and, or, ne } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        let session = await auth.api.getSession({ headers: req.headers });

        // Fallback: Manual token check if getSession fails (for Bearer token auth)
        if (!session) {
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                const { session: sessionTable } = await import("@/db/schema");
                const dbSession = await db.query.session.findFirst({
                    where: eq(sessionTable.token, token),
                    with: { user: true }
                });

                if (dbSession) {
                    const now = new Date();
                    if (dbSession.expiresAt > now) {
                        session = {
                            session: dbSession,
                            user: dbSession.user
                        } as any;
                    }
                }
            }
        }

        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { matchId } = await params;

        // Verify user is part of the match
        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, matchId),
                or(eq(matches.user1Id, session.user.id), eq(matches.user2Id, session.user.id))
            ),
        });

        if (!match) {
            return errorResponse(new Error("Match not found or unauthorized"), 404);
        }

        console.log('[MarkAsRead API] Marking messages as read for match:', matchId, 'user:', session.user.id);

        // Mark all messages from the OTHER user as read
        // (messages the current user hasn't sent)
        const result = await db
            .update(messages)
            .set({
                status: "read",
                updatedAt: new Date(),
            })
            .where(
                and(
                    eq(messages.matchId, matchId),
                    ne(messages.senderId, session.user.id), // Not sent by current user
                    ne(messages.status, "read") // Not already read
                )
            );

        console.log('[MarkAsRead API] Update result:', result);

        return successResponse({
            success: true,
            message: "Messages marked as read"
        });
    } catch (error) {
        console.error("Mark as read error:", error);
        return errorResponse(error);
    }
}
