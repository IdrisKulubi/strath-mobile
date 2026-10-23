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
 * GET /api/date-requests/incoming
 * Get date requests sent TO the current user (pending first)
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
            .where(eq(dateRequests.toUserId, session.user.id))
            .orderBy(desc(dateRequests.createdAt));

        const fromUserIds = requests.map((request) => request.fromUserId);
        const [profileMap, compatibilityMap] = await Promise.all([
            selectProfileCardsByUserIds(fromUserIds),
            computeCompatibilityMany(session.user.id, fromUserIds),
        ]);

        const result = requests.map((r) => {
            const fromProfile = profileMap.get(r.fromUserId);
            const compatibility = compatibilityMap.get(r.fromUserId) ?? { score: 0, reasons: [] };

            const base = {
                id: r.fromUserId as string,
                firstName: fromProfile ? getProfileFirstName(fromProfile) : "Unknown",
                age: fromProfile?.age ?? 0,
                profilePhoto: fromProfile ? getPrimaryProfilePhoto(fromProfile) : undefined,
            };

            return {
                id: r.id,
                fromUserId: r.fromUserId,
                toUserId: r.toUserId,
                vibe: r.vibe,
                message: r.message ?? undefined,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
                fromUser: {
                    ...base,
                    compatibilityScore: compatibility.score,
                    compatibilityReasons: compatibility.reasons,
                },
            };
        });

        return successResponse(result);
    } catch (error) {
        console.error("[date-requests/incoming] Error:", error);
        return errorResponse(error);
    }
}
