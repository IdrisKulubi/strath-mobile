import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { requireMatchmakerBriefAccess } from "@/lib/services/matchmaker-brief-access";
import { undoMatchmakerBriefChange } from "@/lib/services/matchmaker-preference-service";
import { matchmakerRouteErrorResponse } from "@/lib/services/matchmaker-route-errors";

export const dynamic = "force-dynamic";

const undoSchema = z.object({ changeId: z.string().uuid() });

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        const userId = session?.user?.id;
        if (!userId) return errorResponse(new Error("Unauthorized"), 401);
        const denied = await requireMatchmakerBriefAccess(userId);
        if (denied) return denied;
        const { changeId } = undoSchema.parse(await req.json());
        return successResponse(await undoMatchmakerBriefChange({ userId, changeId }));
    } catch (error) {
        console.error("[matchmaker/brief/undo] Error:", error);
        return matchmakerRouteErrorResponse(error);
    }
}
