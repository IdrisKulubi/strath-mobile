/**
 * Study Date Join API
 *
 * POST /api/study-date/[sessionId]/join
 *
 * Sends the session owner a push notification that someone wants to join.
 * Also creates a like-swipe so it can escalate to a match if mutual.
 */
import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { studySessions, swipes, user as userTable, session as sessionTable } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { sendPushNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";

type AuthSession = Awaited<ReturnType<typeof auth.api.getSession>>;

async function getSession(req: NextRequest) {
    let session: AuthSession = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as unknown as AuthSession;
            }
        }
    }
    return session;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ sessionId: string }> }
) {
    try {
        const session = await getSession(req);
        if (!session?.user?.id) return errorResponse("Unauthorized", 401);
        const requesterId = session.user.id;
        const requesterName = session.user.name ?? "Someone";

        const { sessionId } = await params;

        // Find the study session
        const studySession = await db.query.studySessions.findFirst({
            where: and(
                eq(studySessions.id, sessionId),
                eq(studySessions.isActive, true),
            ),
            columns: { userId: true, locationName: true, availableUntil: true, isActive: true },
        });

        if (!studySession) return errorResponse("Session not found or has ended", 404);
        if (studySession.userId === requesterId) return errorResponse("Cannot join your own session", 400);
        if (studySession.availableUntil < new Date()) return errorResponse("Session has expired", 410);

        // Create a like-swipe (or update if already swiped)
        const existing = await db.query.swipes.findFirst({
            where: and(
                eq(swipes.swiperId, requesterId),
                eq(swipes.swipedId, studySession.userId),
            ),
        });

        if (!existing) {
            await db.insert(swipes).values({
                swiperId: requesterId,
                swipedId: studySession.userId,
                isLike: true,
            });
        }

        // Send push notification to session owner (non-blocking)
        const owner = await db.query.user.findFirst({
            where: eq(userTable.id, studySession.userId),
            columns: { pushToken: true },
        });

        if (owner?.pushToken) {
            sendPushNotification(
                owner.pushToken,
                `${requesterName} wants to join you at ${studySession.locationName} 📚`,
                { screen: "study-date", sessionId }
            ).catch(() => {});
        }

        return successResponse({ joined: true });
    } catch (error) {
        console.error("POST /api/study-date/[sessionId]/join error:", error);
        return errorResponse("Failed to send join request", 500);
    }
}
