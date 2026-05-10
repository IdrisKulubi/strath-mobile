import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { profiles, candidatePairs, userMatchInterests } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { canonicalizePairUsers } from "@/lib/services/candidate-pairs-service";
import { canViewUserProfile } from "@/lib/services/profile-view-access";
import { getSessionWithBearerFallback } from "@/lib/security";

export const dynamic = "force-dynamic";

/**
 * GET /api/matches/compatibility/[userId]
 *
 * Returns compatibility score and reasons between the current user and the
 * target user. Used on the profile view screen.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { userId: targetUserId } = await params;
        if (!targetUserId) {
            return errorResponse(new Error("Missing userId"), 400);
        }

        const targetProfile = await db.query.profiles.findFirst({
            where: eq(profiles.userId, targetUserId),
        });

        if (!targetProfile) {
            return errorResponse(new Error("User not found"), 404);
        }

        const canViewProfile = await canViewUserProfile({
            viewerUserId: session.user.id,
            targetUserId,
            targetIsVisible: targetProfile.isVisible,
        });

        if (!canViewProfile) {
            return errorResponse(new Error("User not found"), 404);
        }

        const { userAId, userBId } = canonicalizePairUsers(session.user.id, targetUserId);

        const [{ score, reasons }, activePair, directedInterest] = await Promise.all([
            computeCompatibility(session.user.id, targetUserId),
            db.query.candidatePairs.findFirst({
                where: and(
                    eq(candidatePairs.userAId, userAId),
                    eq(candidatePairs.userBId, userBId),
                    inArray(candidatePairs.status, ["active", "mutual"])
                ),
            }),
            db.query.userMatchInterests.findFirst({
                where: and(
                    eq(userMatchInterests.viewerUserId, session.user.id),
                    eq(userMatchInterests.candidateUserId, targetUserId),
                ),
            }),
        ]);

        const pairDecision =
            activePair?.userAId === session.user.id
                ? activePair.aDecision
                : activePair?.bDecision;

        return successResponse({
            score,
            reasons: reasons.length > 0 ? reasons : ["Potential match"],
            pairId: activePair?.id ?? null,
            currentUserDecision: pairDecision && pairDecision !== "pending"
                ? pairDecision
                : directedInterest?.decision ?? pairDecision ?? "pending",
        });
    } catch (error) {
        console.error("[matches/compatibility/[userId]] Error:", error);
        return errorResponse(error);
    }
}
