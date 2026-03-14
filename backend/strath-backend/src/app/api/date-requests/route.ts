import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateRequests, profiles, swipes, user as userTable } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { dateRequestCreateSchema } from "@/lib/validation";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export const dynamic = "force-dynamic";

function buildUserInfo(
    profile: { firstName?: string | null; age?: number | null; profilePhoto?: string | null; user?: { name?: string | null; profilePhoto?: string | null; image?: string | null } } | null,
    userId: string
) {
    const u = profile?.user;
    return {
        id: userId,
        firstName: profile?.firstName ?? u?.name?.split(" ")[0] ?? "Unknown",
        age: profile?.age ?? 0,
        profilePhoto: profile?.profilePhoto ?? u?.profilePhoto ?? u?.image,
    };
}

async function enrichWithCompatibility(
    userId: string,
    otherUserId: string,
    base: { id: string; firstName: string; age?: number; profilePhoto?: string }
) {
    const { score, reasons } = await computeCompatibility(userId, otherUserId);
    return {
        ...base,
        compatibilityScore: score,
        compatibilityReasons: reasons,
    };
}

/**
 * POST /api/date-requests
 * Create a date request (invite someone on a date)
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const { toUserId, vibe, message } = dateRequestCreateSchema.parse(body);

        if (toUserId === session.user.id) {
            return errorResponse(new Error("Cannot send date request to yourself"), 400);
        }

        const toProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, toUserId),
            with: { user: true },
        });

        if (!toProfile || !toProfile.isVisible) {
            return errorResponse(new Error("User not found"), 404);
        }

        const existing = await db.query.dateRequests.findFirst({
            where: and(
                eq(dateRequests.fromUserId, session.user.id),
                eq(dateRequests.toUserId, toUserId),
                eq(dateRequests.status, "pending")
            ),
        });

        if (existing) {
            return errorResponse(new Error("You already have a pending request to this user"), 400);
        }

        const [inserted] = await db
            .insert(dateRequests)
            .values({
                fromUserId: session.user.id,
                toUserId,
                vibe,
                message: message ?? null,
                status: "pending",
            })
            .returning();

        if (!inserted) {
            return errorResponse(new Error("Failed to create date request"), 500);
        }

        const existingSwipe = await db.query.swipes.findFirst({
            where: and(
                eq(swipes.swiperId, session.user.id),
                eq(swipes.swipedId, toUserId)
            ),
        });
        if (existingSwipe) {
            await db.update(swipes).set({ isLike: true }).where(eq(swipes.id, existingSwipe.id));
        } else {
            await db.insert(swipes).values({
                swiperId: session.user.id,
                swipedId: toUserId,
                isLike: true,
            });
        }

        const toUser = await db.query.user.findFirst({ where: eq(userTable.id, toUserId) });
        const fromName = (await db.query.profiles.findFirst({ where: eq(profiles.userId, session.user.id) }))?.firstName ?? "Someone";
        if (toUser?.pushToken) {
            await sendPushNotification(toUser.pushToken, {
                title: "New date invite 💜",
                body: `${fromName} wants to go on a date with you!`,
                data: {
                    type: NOTIFICATION_TYPES.DATE_REQUEST_RECEIVED,
                    fromUserId: session.user.id,
                    fromName,
                    vibe,
                    requestId: inserted.id,
                },
            });
        }

        const toUserEnriched = await enrichWithCompatibility(
            session.user.id,
            toUserId,
            buildUserInfo(toProfile, toUserId)
        );

        return successResponse({
            id: inserted.id,
            fromUserId: session.user.id,
            toUserId,
            vibe,
            message: inserted.message ?? undefined,
            status: inserted.status,
            createdAt: inserted.createdAt.toISOString(),
            toUser: toUserEnriched,
        });
    } catch (error) {
        console.error("[date-requests] POST Error:", error);
        return errorResponse(error);
    }
}
