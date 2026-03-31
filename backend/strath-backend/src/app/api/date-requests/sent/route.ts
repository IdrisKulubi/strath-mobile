import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateRequests, profiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { computeCompatibility } from "@/lib/services/compatibility-service";

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

        const result = await Promise.all(
            requests.map(async (r) => {
                const toProfile = await db.query.profiles.findFirst({
                    where: eq(profiles.userId, r.toUserId),
                    with: { user: true },
                });
                const primaryPhoto =
                    (Array.isArray(toProfile?.photos) ? toProfile.photos[0] : null)
                    ?? toProfile?.profilePhoto
                    ?? toProfile?.user?.profilePhoto
                    ?? toProfile?.user?.image
                    ?? undefined;

                const base = {
                    id: r.toUserId,
                    firstName: toProfile?.firstName ?? toProfile?.user?.name?.split(" ")[0] ?? "Unknown",
                    age: toProfile?.age ?? 0,
                    profilePhoto: primaryPhoto,
                };

                const { score } = await computeCompatibility(session.user.id, r.toUserId);

                return {
                    id: r.id,
                    toUserId: r.toUserId,
                    vibe: r.vibe,
                    message: r.message ?? undefined,
                    status: r.status as "pending" | "accepted" | "declined" | "expired",
                    createdAt: r.createdAt.toISOString(),
                    toUser: {
                        ...base,
                        compatibilityScore: score,
                    },
                };
            })
        );

        return successResponse(result);
    } catch (error) {
        console.error("[date-requests/sent] Error:", error);
        return errorResponse(error);
    }
}
