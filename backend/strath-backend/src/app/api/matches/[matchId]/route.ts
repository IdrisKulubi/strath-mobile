import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { matches, messages } from "@/db/schema";
import { eq, or, and } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";

// Helper to get session with Bearer token fallback
async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });

    if (!session) {
        const authHeader = req.headers.get('authorization');
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const { session: sessionTable } = await import("@/db/schema");
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

// DELETE /api/matches/[matchId] - Unmatch (delete match and all messages)
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { matchId } = await params;
        const userId = session.user.id;

        // Find the match and verify the user is part of it
        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, matchId),
                or(
                    eq(matches.user1Id, userId),
                    eq(matches.user2Id, userId)
                )
            ),
        });

        if (!match) {
            return errorResponse(new Error("Match not found or you don't have permission"), 404);
        }

        // Delete all messages for this match first (foreign key constraint)
        await db.delete(messages).where(eq(messages.matchId, matchId));

        // Delete the match
        await db.delete(matches).where(eq(matches.id, matchId));

        return successResponse({ 
            message: "Successfully unmatched",
            matchId 
        });
    } catch (error) {
        console.error("Unmatch error:", error);
        return errorResponse(error);
    }
}

// GET /api/matches/[matchId] - Get single match details
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ matchId: string }> }
) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { matchId } = await params;
        const userId = session.user.id;

        const match = await db.query.matches.findFirst({
            where: and(
                eq(matches.id, matchId),
                or(
                    eq(matches.user1Id, userId),
                    eq(matches.user2Id, userId)
                )
            ),
            with: {
                user1: {
                    with: { profile: true }
                },
                user2: {
                    with: { profile: true }
                },
                messages: {
                    limit: 1,
                    orderBy: (messages, { desc }) => [desc(messages.createdAt)],
                },
            },
        });

        if (!match) {
            return errorResponse(new Error("Match not found"), 404);
        }

        const isUser1 = match.user1Id === userId;
        const partner = isUser1 ? match.user2 : match.user1;

        return successResponse({
            match: {
                id: match.id,
                partner: {
                    id: partner.id,
                    name: partner.name,
                    image: partner.image,
                    profile: partner.profile,
                },
                lastMessage: match.messages[0] || null,
                createdAt: match.createdAt.toISOString(),
            }
        });
    } catch (error) {
        console.error("Get match error:", error);
        return errorResponse(error);
    }
}
