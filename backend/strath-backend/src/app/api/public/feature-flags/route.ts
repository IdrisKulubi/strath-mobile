import { successResponse, errorResponse } from "@/lib/api-response";
import { getPublicFeatureFlags } from "@/lib/feature-flags";
import { getSessionWithBearerFallback } from "@/lib/security";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        return successResponse(await getPublicFeatureFlags(session?.user?.id));
    } catch (error) {
        return errorResponse(error);
    }
}
