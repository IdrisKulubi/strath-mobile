import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { pairRespondSchema } from "@/lib/validation";
import { respondToCandidatePair } from "@/lib/services/candidate-pairs-service";
import { profiles, user as userTable } from "@/db/schema";
import { db } from "@/lib/db";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export const dynamic = "force-dynamic";

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ pairId: string }> },
) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { pairId } = await params;
        if (!pairId) {
            return errorResponse(new Error("Missing pair id"), 400);
        }

        const body = await req.json();
        const { decision } = pairRespondSchema.parse(body);

        const result = await respondToCandidatePair(pairId, session.user.id, decision);

        if (result.mutual) {
            const [userA, userB, profileA, profileB] = await Promise.all([
                db.query.user.findFirst({ where: eq(userTable.id, result.mutual.userAId) }),
                db.query.user.findFirst({ where: eq(userTable.id, result.mutual.userBId) }),
                db.query.profiles.findFirst({ where: eq(profiles.userId, result.mutual.userAId) }),
                db.query.profiles.findFirst({ where: eq(profiles.userId, result.mutual.userBId) }),
            ]);

            const nameA = profileA?.firstName || userA?.name?.split(" ")[0] || "Someone";
            const nameB = profileB?.firstName || userB?.name?.split(" ")[0] || "Someone";

            if (userA?.pushToken) {
                await sendPushNotification(userA.pushToken, {
                    title: "You both said yes",
                    body: `You and ${nameB} are open to meeting`,
                    data: {
                        type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                        pairId,
                        userId: result.mutual.userBId,
                    },
                });
            }

            if (userB?.pushToken) {
                await sendPushNotification(userB.pushToken, {
                    title: "You both said yes",
                    body: `You and ${nameA} are open to meeting`,
                    data: {
                        type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                        pairId,
                        userId: result.mutual.userAId,
                    },
                });
            }
        }

        return successResponse({
            pair: result.pair,
            mutual: result.mutual,
        });
    } catch (error) {
        console.error("[pairs/[pairId]/respond] Error:", error);
        return errorResponse(error);
    }
}
