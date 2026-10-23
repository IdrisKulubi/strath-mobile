import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { getPhotoImprovementTips } from "@/lib/services/photo-intelligence-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const tips = await getPhotoImprovementTips(session.user.id);
        return successResponse({ userId: session.user.id, tips });
    } catch (error) {
        console.error("[photos/improvement-tips] Error:", error);
        return errorResponse(error);
    }
}
