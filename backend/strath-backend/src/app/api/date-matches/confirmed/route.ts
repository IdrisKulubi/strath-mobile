import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateMatches, profiles } from "@/db/schema";
import { eq, or, desc } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { computeCompatibility } from "@/lib/services/compatibility-service";

export const dynamic = "force-dynamic";

function toArrangementStatus(
    dm: { callCompleted: boolean | null; userAConfirmed: boolean | null; userBConfirmed: boolean | null; status: string }
): "call_pending" | "call_done" | "being_arranged" | "date_confirmed" {
    if (!dm.callCompleted) return "call_pending";
    const bothConfirmed = dm.userAConfirmed && dm.userBConfirmed;
    if (bothConfirmed && dm.status === "scheduled") return "date_confirmed";
    if (bothConfirmed) return "being_arranged";
    return "call_done";
}

/**
 * GET /api/date-matches/confirmed
 * Get confirmed date matches (both accepted, in arrangement pipeline)
 */
export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const matches = await db
            .select()
            .from(dateMatches)
            .where(
                or(
                    eq(dateMatches.userAId, session.user.id),
                    eq(dateMatches.userBId, session.user.id)
                )
            )
            .orderBy(desc(dateMatches.createdAt));

        const result = await Promise.all(
            matches.map(async (dm) => {
                const otherUserId = dm.userAId === session.user.id ? dm.userBId : dm.userAId;
                const otherProfile = await db.query.profiles.findFirst({
                    where: eq(profiles.userId, otherUserId),
                    with: { user: true },
                });

                const { score, reasons } = await computeCompatibility(session.user.id, otherUserId);

                return {
                    id: dm.id,
                    requestId: dm.requestId,
                    withUser: {
                        id: otherUserId,
                        firstName: otherProfile?.firstName ?? otherProfile?.user?.name?.split(" ")[0] ?? "Unknown",
                        age: otherProfile?.age ?? 0,
                        profilePhoto: otherProfile?.profilePhoto ?? otherProfile?.user?.profilePhoto ?? otherProfile?.user?.image,
                        compatibilityScore: score,
                        compatibilityReasons: reasons,
                    },
                    vibe: dm.vibe,
                    arrangementStatus: toArrangementStatus(dm),
                    callMatchId: undefined,
                    createdAt: dm.createdAt.toISOString(),
                };
            })
        );

        return successResponse(result);
    } catch (error) {
        console.error("[date-matches/confirmed] Error:", error);
        return errorResponse(error);
    }
}
