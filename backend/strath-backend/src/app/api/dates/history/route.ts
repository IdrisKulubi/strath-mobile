import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { dateFeedback, dateMatches, profiles } from "@/db/schema";
import { eq, or, desc, and } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/dates/history
 * Get past dates (attended, cancelled, no_show)
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

        const historyStatuses = ["attended", "cancelled", "no_show"];
        const filtered = matches.filter((m) => historyStatuses.includes(m.status));

        const result = await Promise.all(
            filtered.map(async (dm) => {
                const otherUserId = dm.userAId === session.user.id ? dm.userBId : dm.userAId;
                const otherProfile = await db.query.profiles.findFirst({
                    where: eq(profiles.userId, otherUserId),
                    with: { user: true },
                });
                const myFeedback = await db.query.dateFeedback.findFirst({
                    where: and(
                        eq(dateFeedback.dateMatchId, dm.id),
                        eq(dateFeedback.userId, session.user.id)
                    ),
                });

                return {
                    id: dm.id,
                    matchId: dm.id,
                    status: dm.status as "pending_setup" | "scheduled" | "attended" | "cancelled" | "expired",
                    hasFeedback: myFeedback?.userId === session.user.id,
                    venueName: dm.venueName ?? undefined,
                    venueAddress: dm.venueAddress ?? undefined,
                    scheduledAt: dm.scheduledAt?.toISOString() ?? undefined,
                    withUser: {
                        id: otherUserId,
                        firstName: otherProfile?.firstName ?? otherProfile?.user?.name?.split(" ")[0] ?? "Unknown",
                        profilePhoto: otherProfile?.profilePhoto ?? otherProfile?.user?.profilePhoto ?? otherProfile?.user?.image,
                    },
                };
            })
        );

        return successResponse(result);
    } catch (error) {
        console.error("[dates/history] Error:", error);
        return errorResponse(error);
    }
}
