import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { listMutualDatesForUser } from "@/lib/services/mutual-match-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const items = await listMutualDatesForUser(session.user.id);
        return successResponse(items);
    } catch (error) {
        console.error("[dates/mutual] Error:", error);
        return errorResponse(error);
    }
}
