import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { profiles, candidatePairs } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { canonicalizePairUsers } from "@/lib/services/candidate-pairs-service";

export const dynamic = "force-dynamic";

async function getSessionWithFallback(req: NextRequest) {
    let session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
        const authHeader = req.headers.get("authorization");
        if (authHeader?.startsWith("Bearer ")) {
            const token = authHeader.split(" ")[1];
            const { session: sessionTable } = await import("@/db/schema");
            const dbSession = await db.query.session.findFirst({
                where: eq(sessionTable.token, token),
                with: { user: true },
            });
            if (dbSession && dbSession.expiresAt > new Date()) {
                session = { session: dbSession, user: dbSession.user } as any;
            }
        }
    }
    return session;
}

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
        const session = await getSessionWithFallback(req);
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

        if (!targetProfile || !targetProfile.isVisible) {
            return errorResponse(new Error("User not found"), 404);
        }

        const { userAId, userBId } = canonicalizePairUsers(session.user.id, targetUserId);

        const [{ score, reasons }, activePair] = await Promise.all([
            computeCompatibility(session.user.id, targetUserId),
            db.query.candidatePairs.findFirst({
                where: and(
                    eq(candidatePairs.userAId, userAId),
                    eq(candidatePairs.userBId, userBId),
                    inArray(candidatePairs.status, ["active", "mutual"])
                ),
            }),
        ]);

        return successResponse({
            score,
            reasons: reasons.length > 0 ? reasons : ["Potential match"],
            pairId: activePair?.id ?? null,
            currentUserDecision:
                activePair?.userAId === session.user.id
                    ? activePair.aDecision
                    : activePair?.bDecision ?? "pending",
        });
    } catch (error) {
        console.error("[matches/compatibility/[userId]] Error:", error);
        return errorResponse(error);
    }
}
