import { NextRequest } from "next/server";
import { and, asc, eq, lt } from "drizzle-orm";

import { user, userMatchSignals, profiles } from "@/db/schema";
import { db as readDb } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await requireAdminApiSession(request);
        if (!session?.user?.id) {
            return errorResponse("Forbidden - admin only", 403);
        }

        const rows = await readDb
            .select({
                userId: userMatchSignals.userId,
                photoQualityScore: userMatchSignals.photoQualityScore,
                hasUsableProfilePhoto: userMatchSignals.hasUsableProfilePhoto,
                photoAnalysisCompleted: userMatchSignals.photoAnalysisCompleted,
                firstName: profiles.firstName,
                email: user.email,
            })
            .from(userMatchSignals)
            .innerJoin(profiles, eq(profiles.userId, userMatchSignals.userId))
            .innerJoin(user, eq(user.id, userMatchSignals.userId))
            .where(
                and(
                    eq(userMatchSignals.photoAnalysisCompleted, true),
                    lt(userMatchSignals.photoQualityScore, 45),
                ),
            )
            .orderBy(asc(userMatchSignals.photoQualityScore))
            .limit(100);

        return successResponse({ profiles: rows });
    } catch (error) {
        console.error("[admin/photo-quality/low-quality-profiles] Error:", error);
        return errorResponse(error);
    }
}
