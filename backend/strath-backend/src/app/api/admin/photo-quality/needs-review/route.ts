import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { profilePhotoAnalysis, profiles, user } from "@/db/schema";
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
                analysisId: profilePhotoAnalysis.id,
                userId: profilePhotoAnalysis.userId,
                photoUrl: profilePhotoAnalysis.photoUrl,
                qualityScore: profilePhotoAnalysis.qualityScore,
                moderationStatus: profilePhotoAnalysis.moderationStatus,
                moderationReason: profilePhotoAnalysis.moderationReason,
                firstName: profiles.firstName,
                email: user.email,
            })
            .from(profilePhotoAnalysis)
            .innerJoin(profiles, eq(profiles.userId, profilePhotoAnalysis.userId))
            .innerJoin(user, eq(user.id, profilePhotoAnalysis.userId))
            .where(eq(profilePhotoAnalysis.moderationStatus, "needs_review"))
            .limit(100);

        return successResponse({ photos: rows });
    } catch (error) {
        console.error("[admin/photo-quality/needs-review] Error:", error);
        return errorResponse(error);
    }
}
