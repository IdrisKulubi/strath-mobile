import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { reanalyzeUserPhotos } from "@/lib/services/photo-intelligence-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const result = await reanalyzeUserPhotos(session.user.id);
        return successResponse(result);
    } catch (error) {
        console.error("[photos/reanalyze] Error:", error);
        return errorResponse(error);
    }
}
