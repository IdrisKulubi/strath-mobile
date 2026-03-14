import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateRequests, dateMatches, swipes, matches, user as userTable } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { dateRequestRespondSchema } from "@/lib/validation";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/date-requests/[id]/respond
 * Accept or decline an incoming date request
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { id: requestId } = await params;
        if (!requestId) {
            return errorResponse(new Error("Missing request id"), 400);
        }

        const body = await req.json();
        const { action } = dateRequestRespondSchema.parse(body);

        const request = await db.query.dateRequests.findFirst({
            where: eq(dateRequests.id, requestId),
        });

        if (!request) {
            return errorResponse(new Error("Date request not found"), 404);
        }

        if (request.toUserId !== session.user.id) {
            return errorResponse(new Error("You can only respond to requests sent to you"), 403);
        }

        if (request.status !== "pending") {
            return errorResponse(new Error("This request has already been responded to"), 400);
        }

        const newStatus = action === "accept" ? "accepted" : "declined";

        await db
            .update(dateRequests)
            .set({ status: newStatus, updatedAt: new Date() })
            .where(eq(dateRequests.id, requestId));

        if (action === "accept") {
            const existingMatch = await db.query.matches.findFirst({
                where: or(
                    and(eq(matches.user1Id, request.fromUserId), eq(matches.user2Id, request.toUserId)),
                    and(eq(matches.user1Id, request.toUserId), eq(matches.user2Id, request.fromUserId))
                ),
            });

            if (!existingMatch) {
                await db.insert(matches).values({
                    user1Id: request.fromUserId,
                    user2Id: request.toUserId,
                });
            }

            const otherSwipe = await db.query.swipes.findFirst({
                where: and(
                    eq(swipes.swiperId, request.toUserId),
                    eq(swipes.swipedId, request.fromUserId),
                    eq(swipes.isLike, true)
                ),
            });

            if (!otherSwipe) {
                await db.insert(swipes).values({
                    swiperId: request.toUserId,
                    swipedId: request.fromUserId,
                    isLike: true,
                });
            }

            await db.insert(dateMatches).values({
                requestId: request.id,
                userAId: request.fromUserId,
                userBId: request.toUserId,
                vibe: request.vibe,
                status: "pending_setup",
            });

            const { profiles } = await import("@/db/schema");
            const toName =
                (await db.query.profiles.findFirst({ where: eq(profiles.userId, request.toUserId) }))
                    ?.firstName ?? "Someone";

            const fromUser = await db.query.user.findFirst({ where: eq(userTable.id, request.fromUserId) });
            if (fromUser?.pushToken) {
                await sendPushNotification(fromUser.pushToken, {
                    title: "Date invite accepted! 💜",
                    body: `${toName} said yes! Time to set up your date.`,
                    data: { type: NOTIFICATION_TYPES.DATE_REQUEST_ACCEPTED, toUserId: request.toUserId, toName, requestId },
                });
            }
        } else {
            const fromUser = await db.query.user.findFirst({ where: eq(userTable.id, request.fromUserId) });
            if (fromUser?.pushToken) {
                await sendPushNotification(fromUser.pushToken, {
                    title: "Date invite declined",
                    body: "Someone passed this time.",
                    data: { type: NOTIFICATION_TYPES.DATE_REQUEST_DECLINED, toUserId: request.toUserId, requestId },
                });
            }
        }

        if (action === "accept") {
            logEvent(EVENT_TYPES.DATE_REQUEST_ACCEPTED, session.user.id, { requestId, fromUserId: request.fromUserId }).catch(() => {});
        } else {
            logEvent(EVENT_TYPES.DATE_REQUEST_DECLINED, session.user.id, { requestId }).catch(() => {});
        }

        return successResponse({ success: true, status: newStatus });
    } catch (error) {
        console.error("[date-requests/[id]/respond] Error:", error);
        return errorResponse(error);
    }
}
