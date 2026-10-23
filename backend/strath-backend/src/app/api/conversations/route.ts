import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { listConversationsForUser } from "@/lib/services/conversations-service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const conversations = await listConversationsForUser(session.user.id);
        return successResponse({ conversations });
    } catch (error) {
        console.error("[conversations] Error:", error);
        return errorResponse(error);
    }
}
