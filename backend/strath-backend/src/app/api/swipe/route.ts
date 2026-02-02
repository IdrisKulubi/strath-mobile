import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { swipes, matches, user } from "@/db/schema";
import { swipeSchema } from "@/lib/validation";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { sendPushNotification } from "@/lib/notifications";
import { redis } from "@/lib/redis";

async function logPulseEvent(type: string, message: string, data?: any) {
    try {
        const pulse = {
            id: Math.random().toString(36).substring(7),
            type,
            message,
            data,
            timestamp: Date.now(),
        };
        await redis.lpush('pulse_events', pulse);
        await redis.ltrim('pulse_events', 0, 49); // Keep last 50 events
    } catch (err) {
        console.error("Failed to log pulse event:", err);
    }
}

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

        // Check if user already swiped on this person (prevent duplicates)
        const existingSwipe = await db.query.swipes.findFirst({
            where: and(
                eq(swipes.swiperId, session.user.id),
                eq(swipes.swipedId, targetUserId)
            ),
        });

        // If already swiped, update the existing swipe instead of creating a new one
        if (existingSwipe) {
            await db
                .update(swipes)
                .set({ isLike, createdAt: new Date() })
                .where(eq(swipes.id, existingSwipe.id));
        } else {
            // Record the new swipe
            await db.insert(swipes).values({
                swiperId: session.user.id,
                swipedId: targetUserId,
                isLike,
            });
        }

        let isMatch = false;
        let matchData = null;

        if (isLike) {
            // First check if a match already exists between these users
            const existingMatch = await db.query.matches.findFirst({
                where: or(
                    and(
                        eq(matches.user1Id, session.user.id),
                        eq(matches.user2Id, targetUserId)
                    ),
                    and(
                        eq(matches.user1Id, targetUserId),
                        eq(matches.user2Id, session.user.id)
                    )
                ),
            });

            if (existingMatch) {
                // Match already exists, return it
                isMatch = true;
                matchData = existingMatch;
                console.log(`[SWIPE] Match already exists between ${session.user.id} and ${targetUserId}`);
            } else {
                // Check if the other user already liked us
                const otherSwipe = await db.query.swipes.findFirst({
                    where: and(
                        eq(swipes.swiperId, targetUserId),
                        eq(swipes.swipedId, session.user.id),
                        eq(swipes.isLike, true)
                    ),
                });

                console.log(`[SWIPE] User ${session.user.id} liked ${targetUserId}. Other user's swipe:`, otherSwipe ? 'EXISTS (liked)' : 'NOT FOUND or PASS');

                if (otherSwipe) {
                    isMatch = true;
                    // Create match
                    try {
                        const [newMatch] = await db
                            .insert(matches)
                            .values({
                                user1Id: session.user.id,
                                user2Id: targetUserId,
                            })
                            .returning();

                        matchData = newMatch;
                        console.log(`[SWIPE] NEW MATCH CREATED! ID: ${newMatch.id}`);

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

                        // Log Pulse Event for Match
                        await logPulseEvent('match', `New match just happened! 🔥`, {
                            university: user1?.name ? user1.name.split(' ')[0] : 'Someone'
                        });
                    } catch (matchError) {
                        console.error(`[SWIPE] Error creating match:`, matchError);
                        // Match creation failed, but swipe was recorded
                        // This could happen due to race condition - check if match now exists
                        const raceMatch = await db.query.matches.findFirst({
                            where: or(
                                and(
                                    eq(matches.user1Id, session.user.id),
                                    eq(matches.user2Id, targetUserId)
                                ),
                                and(
                                    eq(matches.user1Id, targetUserId),
                                    eq(matches.user2Id, session.user.id)
                                )
                            ),
                        });
                        if (raceMatch) {
                            isMatch = true;
                            matchData = raceMatch;
                            console.log(`[SWIPE] Race condition resolved - match found: ${raceMatch.id}`);
                        }
                    }
                }
            }
        }

        // Log Pulse Event for Activity (optional/sampled)
        if (Math.random() > 0.7) { // Sample activity to avoid noise
            const user1 = await db.query.user.findFirst({
                where: eq(user.id, session.user.id),
            });
            await logPulseEvent('activity', `${user1?.name?.split(' ')[0] || 'Someone'} is active in the Lounge`, {
                type: action
            });
        }

        return successResponse({ success: true, isMatch, match: matchData });
    } catch (error) {
        return errorResponse(error);
    }
}
