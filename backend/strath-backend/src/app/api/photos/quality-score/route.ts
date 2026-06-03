import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { getUserPhotoQualityScore } from "@/lib/services/photo-intelligence-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const score = await getUserPhotoQualityScore(session.user.id);
        return successResponse({ userId: session.user.id, photoQualityScore: score });
    } catch (error) {
        console.error("[photos/quality-score] Error:", error);
        return errorResponse(error);
    }
}
