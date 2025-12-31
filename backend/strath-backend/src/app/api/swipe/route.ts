import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { swipes, matches, user } from "@/db/schema";
import { swipeSchema } from "@/lib/validation";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { sendPushNotification } from "@/lib/notifications";

export async function POST(req: NextRequest) {
    try {
        let session = await auth.api.getSession({ headers: req.headers });

        // Fallback: Manual token check for Bearer token auth (mobile clients)
        if (!session) {
            const authHeader = req.headers.get('authorization');
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.split(' ')[1];
                // Import session table dynamically to avoid circular deps
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

        const body = await req.json();
        const { targetUserId, action } = swipeSchema.parse(body);

        const isLike = action === "like";

        // Record the swipe
        await db.insert(swipes).values({
            swiperId: session.user.id,
            swipedId: targetUserId,
            isLike,
        });

        let isMatch = false;
        let matchData = null;

        if (isLike) {
            // Check if the other user already liked us
            const otherSwipe = await db.query.swipes.findFirst({
                where: and(
                    eq(swipes.swiperId, targetUserId),
                    eq(swipes.swipedId, session.user.id),
                    eq(swipes.isLike, true)
                ),
            });

            if (otherSwipe) {
                isMatch = true;
                // Create match
                const [newMatch] = await db
                    .insert(matches)
                    .values({
                        user1Id: session.user.id,
                        user2Id: targetUserId,
                    })
                    .returning();

                matchData = newMatch;

                // Fetch users to get push tokens
                const user1 = await db.query.user.findFirst({
                    where: eq(user.id, session.user.id),
                });
                const user2 = await db.query.user.findFirst({
                    where: eq(user.id, targetUserId),
                });

                // Notify user 2 (target)
                if (user2?.pushToken) {
                    await sendPushNotification(
                        user2.pushToken,
                        "New Match! 🎉",
                        { matchId: newMatch.id, partnerId: session.user.id }
                    );
                }

                // Notify user 1 (current) - optional, usually UI handles this immediately
                if (user1?.pushToken) {
                    await sendPushNotification(
                        user1.pushToken,
                        "It's a Match! 🎉",
                        { matchId: newMatch.id, partnerId: targetUserId }
                    );
                }
            }
        }

        return successResponse({ success: true, isMatch, match: matchData });
    } catch (error) {
        return errorResponse(error);
    }
}
