import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { getNotificationCountsForUser } from "@/lib/services/notification-counts-service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const session = await getSessionWithFallback(request);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const counts = await getNotificationCountsForUser(session.user.id);

        return successResponse({
            ...counts,
            incomingRequests: 0,
        });
    } catch {
        return errorResponse(new Error("Failed to fetch notification counts"));
    }
}
