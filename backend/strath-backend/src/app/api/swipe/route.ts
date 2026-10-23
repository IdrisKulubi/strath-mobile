import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { swipes, matches, user } from "@/db/schema";
import { swipeSchema } from "@/lib/validation";
import { successResponse, errorResponse } from "@/lib/api-response";
import { eq, and, or } from "drizzle-orm";

export const dynamic = "force-dynamic";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { recordIncomingLike } from "@/lib/services/incoming-like-service";
import { redis } from "@/lib/redis";
import { ensureMissionForMatch } from "@/lib/services/mission-service";
import { getSessionWithBearerFallback } from "@/lib/security";
import { requireMatchmakingAccess } from "@/lib/services/profile-access";
import { resolveMatchExcludedUserIds } from "@/lib/services/match-exclusion-service";

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

async function upsertSwipe(swiperId: string, swipedId: string, isLike: boolean) {
    const existingSwipe = await db.query.swipes.findFirst({
        where: and(
            eq(swipes.swiperId, swiperId),
            eq(swipes.swipedId, swipedId),
        ),
    });

    if (existingSwipe) {
        await db
            .update(swipes)
            .set({ isLike, createdAt: new Date() })
            .where(eq(swipes.id, existingSwipe.id));
        return;
    }

    await db.insert(swipes).values({
        swiperId,
        swipedId,
        isLike,
    });
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);

        if (!session) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        try {
            await requireMatchmakingAccess(session.user.id);
        } catch (accessError) {
            return errorResponse(accessError, accessError instanceof Error && accessError.message === "Profile not found" ? 404 : 403);
        }

        const body = await req.json();
        const { targetUserId, action } = swipeSchema.parse(body);

        const isLike = action === "like";

        const matchExcludedUserIds = await resolveMatchExcludedUserIds();
        if (isLike && (matchExcludedUserIds.has(session.user.id) || matchExcludedUserIds.has(targetUserId))) {
            return errorResponse(
                new Error("Matchmaking is disabled for staff or admin test accounts."),
                403,
            );
        }

        if (!isLike) {
            await upsertSwipe(session.user.id, targetUserId, false);

            if (Math.random() > 0.7) {
                const user1 = await db.query.user.findFirst({
                    where: eq(user.id, session.user.id),
                });
                await logPulseEvent('activity', `${user1?.name?.split(' ')[0] || 'Someone'} is active in the Lounge`, {
                    type: action
                });
            }

            return successResponse({ success: true, isMatch: false, match: null });
        }

        let isMatch = false;
        let matchData = null;

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
            await upsertSwipe(session.user.id, targetUserId, true);
            isMatch = true;
            matchData = existingMatch;
            console.log(`[SWIPE] Match already exists between ${session.user.id} and ${targetUserId}`);
        } else {
            const otherSwipe = await db.query.swipes.findFirst({
                where: and(
                    eq(swipes.swiperId, targetUserId),
                    eq(swipes.swipedId, session.user.id),
                    eq(swipes.isLike, true)
                ),
            });

            console.log(`[SWIPE] User ${session.user.id} liked ${targetUserId}. Other user's swipe:`, otherSwipe ? 'EXISTS (liked)' : 'NOT FOUND or PASS');

            if (!otherSwipe) {
                await recordIncomingLike({
                    swiperId: session.user.id,
                    swipedId: targetUserId,
                });
            }

            if (otherSwipe) {
                isMatch = true;
                await upsertSwipe(session.user.id, targetUserId, true);
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

                    let missionTitle: string | null = null;
                    let missionEmoji: string | null = null;
                    try {
                        const mission = await ensureMissionForMatch(newMatch.id);
                        if (mission) {
                            missionTitle = mission.title;
                            missionEmoji = mission.emoji;
                        }
                    } catch (missionError) {
                        console.error(`[SWIPE] Failed to create mission for match ${newMatch.id}:`, missionError);
                    }

                    const user1 = await db.query.user.findFirst({
                        where: eq(user.id, session.user.id),
                    });
                    const user2 = await db.query.user.findFirst({
                        where: eq(user.id, targetUserId),
                    });

                    const user1FirstName = user1?.name?.split(' ')[0] ?? 'Someone';
                    const user2FirstName = user2?.name?.split(' ')[0] ?? 'Someone';

                    if (user2?.pushToken) {
                        await sendPushNotification(user2.pushToken, {
                            title: "It's a Date Match! 💜",
                            body: `You and ${user1FirstName} both accepted! Say hi in chat while we arrange your date.`,
                            data: {
                                type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                                matchId: newMatch.id,
                                userId: session.user.id,
                            },
                        });
                    }

                    if (user1?.pushToken) {
                        await sendPushNotification(user1.pushToken, {
                            title: "It's a Date Match! 💜",
                            body: `You and ${user2FirstName} both accepted! Say hi in chat while we arrange your date.`,
                            data: {
                                type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                                matchId: newMatch.id,
                                userId: targetUserId,
                            },
                        });
                    }

                    await logPulseEvent('match', `New match just happened! 🔥`, {
                        university: user1?.name ? user1.name.split(' ')[0] : 'Someone'
                    });
                } catch (matchError) {
                    console.error(`[SWIPE] Error creating match:`, matchError);
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

        if (Math.random() > 0.7) {
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
