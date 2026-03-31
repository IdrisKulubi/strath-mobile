import { successResponse, errorResponse } from "@/lib/api-response";
import { getPublicFeatureFlags } from "@/lib/feature-flags";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        return successResponse(await getPublicFeatureFlags());
    } catch (error) {
        return errorResponse(error);
    }
}
