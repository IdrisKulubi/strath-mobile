import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateRequests } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { computeCompatibilityMany } from "@/lib/services/compatibility-service";
import {
    getPrimaryProfilePhoto,
    getProfileFirstName,
    selectProfileCardsByUserIds,
} from "@/lib/db/queries/profiles";

export const dynamic = "force-dynamic";

/**
 * GET /api/date-requests/sent
 * Get date requests sent BY the current user
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const requests = await db
            .select()
            .from(dateRequests)
            .where(eq(dateRequests.fromUserId, session.user.id))
            .orderBy(desc(dateRequests.createdAt));

        const toUserIds = requests.map((request) => request.toUserId);
        const [profileMap, compatibilityMap] = await Promise.all([
            selectProfileCardsByUserIds(toUserIds),
            computeCompatibilityMany(session.user.id, toUserIds),
        ]);

        const result = requests.map((r) => {
            const toProfile = profileMap.get(r.toUserId);
            const compatibility = compatibilityMap.get(r.toUserId) ?? { score: 0, reasons: [] };

            const base = {
                id: r.toUserId,
                firstName: toProfile ? getProfileFirstName(toProfile) : "Unknown",
                age: toProfile?.age ?? 0,
                profilePhoto: toProfile ? getPrimaryProfilePhoto(toProfile) : undefined,
            };

            return {
                id: r.id,
                toUserId: r.toUserId,
                vibe: r.vibe,
                message: r.message ?? undefined,
                status: r.status as "pending" | "accepted" | "declined" | "expired",
                createdAt: r.createdAt.toISOString(),
                toUser: {
                    ...base,
                    compatibilityScore: compatibility.score,
                },
            };
        });

        return successResponse(result);
    } catch (error) {
        console.error("[date-requests/sent] Error:", error);
        return errorResponse(error);
    }
}
