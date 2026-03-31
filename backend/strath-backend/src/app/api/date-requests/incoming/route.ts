import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateRequests, profiles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { computeCompatibility } from "@/lib/services/compatibility-service";

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

        const result = await Promise.all(
            requests.map(async (r) => {
                const fromProfile = await db.query.profiles.findFirst({
                    where: eq(profiles.userId, r.fromUserId),
                    with: { user: true },
                });
                const primaryPhoto =
                    (Array.isArray(fromProfile?.photos) ? fromProfile.photos[0] : null)
                    ?? fromProfile?.profilePhoto
                    ?? fromProfile?.user?.profilePhoto
                    ?? fromProfile?.user?.image
                    ?? undefined;

                const base = {
                    id: r.fromUserId as string,
                    firstName: fromProfile?.firstName ?? fromProfile?.user?.name?.split(" ")[0] ?? "Unknown",
                    age: fromProfile?.age ?? 0,
                    profilePhoto: primaryPhoto,
                };

                const { score, reasons } = await computeCompatibility(session.user.id, r.fromUserId);

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
                        compatibilityScore: score,
                        compatibilityReasons: reasons,
                    },
                };
            })
        );

        return successResponse(result);
    } catch (error) {
        console.error("[date-requests/incoming] Error:", error);
        return errorResponse(error);
    }
}
