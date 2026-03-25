import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/security";
import { getFaceVerificationAdminOverview } from "@/lib/services/face-verification-admin";

export async function GET(req: NextRequest) {
    try {
        const session = await requireAdminApiSession(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized: Admin only"), 403);
        }

        const limitParam = Number(req.nextUrl.searchParams.get("limit") || "20");
        const limit = Number.isFinite(limitParam) ? limitParam : 20;
        const overview = await getFaceVerificationAdminOverview(limit);

        return successResponse(overview);
    } catch (error) {
        return errorResponse(error);
    }
}
