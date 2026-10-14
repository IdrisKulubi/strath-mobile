import { NextRequest } from "next/server";

import { getSessionWithBearerFallback } from "@/lib/security";
import { successResponse, errorResponse } from "@/lib/api-response";
import { recordUserPresence } from "@/lib/services/presence-service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json().catch(() => ({}));
        const isOnline = body?.isOnline !== false;
        const now = new Date();

        const result = await recordUserPresence({
            userId: session.user.id,
            isOnline,
            now,
        });

        return successResponse(result);
    } catch (error) {
        console.error("[user/presence] Error:", error);
        return errorResponse(error);
    }
}
