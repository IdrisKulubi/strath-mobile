import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateMatches, matches } from "@/db/schema";
import { eq, or, and, desc } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { computeCompatibilityMany } from "@/lib/services/compatibility-service";
import {
    getPrimaryProfilePhoto,
    getProfileFirstName,
    selectProfileCardsByUserIds,
} from "@/lib/db/queries/profiles";

export const dynamic = "force-dynamic";

function toArrangementStatus(
    dm: { callCompleted: boolean | null; userAConfirmed: boolean | null; userBConfirmed: boolean | null; status: string }
): "mutual" | "being_arranged" | "date_confirmed" {
    if (dm.status === "scheduled") return "date_confirmed";
    if (dm.status === "pending_setup") return "being_arranged";
    return "mutual";
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

        const dateMatchRows = await db
            .select()
            .from(dateMatches)
            .where(
                or(
                    eq(dateMatches.userAId, session.user.id),
                    eq(dateMatches.userBId, session.user.id)
                )
            )
            .orderBy(desc(dateMatches.createdAt));

        const otherUserIds = dateMatchRows.map((dm) =>
            dm.userAId === session.user.id ? dm.userBId : dm.userAId,
        );
        const [profileMap, compatibilityMap] = await Promise.all([
            selectProfileCardsByUserIds(otherUserIds),
            computeCompatibilityMany(session.user.id, otherUserIds),
        ]);

        const result = await Promise.all(
            dateMatchRows.map(async (dm) => {
                const otherUserId = dm.userAId === session.user.id ? dm.userBId : dm.userAId;
                const otherProfile = profileMap.get(otherUserId);
                const compatibility = compatibilityMap.get(otherUserId) ?? { score: 0, reasons: [] };

                const chatMatch = await db.query.matches.findFirst({
                    where: or(
                        and(eq(matches.user1Id, dm.userAId), eq(matches.user2Id, dm.userBId)),
                        and(eq(matches.user1Id, dm.userBId), eq(matches.user2Id, dm.userAId))
                    ),
                    columns: { id: true },
                });

                return {
                    id: dm.id,
                    requestId: dm.requestId,
                    withUser: {
                        id: otherUserId,
                        firstName: otherProfile ? getProfileFirstName(otherProfile) : "Unknown",
                        age: otherProfile?.age ?? 0,
                        profilePhoto: otherProfile ? getPrimaryProfilePhoto(otherProfile) : undefined,
                        compatibilityScore: compatibility.score,
                        compatibilityReasons: compatibility.reasons,
                    },
                    vibe: dm.vibe,
                    arrangementStatus: toArrangementStatus(dm),
                    callMatchId: chatMatch?.id ?? undefined,
                    venueName: dm.venueName ?? undefined,
                    venueAddress: dm.venueAddress ?? undefined,
                    scheduledAt: dm.scheduledAt?.toISOString() ?? undefined,
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
