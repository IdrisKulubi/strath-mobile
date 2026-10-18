import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/security";
import { getProfileIntelligenceAdminOverview } from "@/lib/services/profile-intelligence-admin";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await requireAdminApiSession(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized: Admin only"), 403);
        }

        const overview = await getProfileIntelligenceAdminOverview();
        return successResponse(overview);
    } catch (error) {
        console.error("[admin/profile-intelligence/overview] Error:", error);
        return errorResponse(error);
    }
}
