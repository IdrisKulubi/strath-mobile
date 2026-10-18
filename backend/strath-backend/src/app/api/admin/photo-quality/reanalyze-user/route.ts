import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/security";
import { reanalyzeUserPhotos } from "@/lib/services/photo-intelligence-service";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
    userId: z.string().min(1),
});

export async function POST(request: NextRequest) {
    try {
        const session = await requireAdminApiSession(request);
        if (!session?.user?.id) {
            return errorResponse("Forbidden - admin only", 403);
        }

        const body = bodySchema.parse(await request.json());
        const result = await reanalyzeUserPhotos(body.userId);
        return successResponse(result);
    } catch (error) {
        console.error("[admin/photo-quality/reanalyze-user] Error:", error);
        return errorResponse(error);
    }
}
