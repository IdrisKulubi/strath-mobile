import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { EVENT_TYPES, logEvent } from "@/lib/analytics";
import { getMatchmakerV2Rollout } from "@/lib/feature-flags";
import { getSessionWithBearerFallback } from "@/lib/security";

export const dynamic = "force-dynamic";

const eventSchema = z.object({
    event: z.literal("exposed"),
    version: z.enum(["v1", "v2"]),
});

export async function POST(request: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(request);
        const userId = session?.user?.id;
        if (!userId) return errorResponse(new Error("Unauthorized"), 401);

        const body = eventSchema.parse(await request.json());
        const rollout = await getMatchmakerV2Rollout(userId);
        const assignedVersion = rollout.enabled ? "v2" : "v1";

        await logEvent(EVENT_TYPES.HOME_EXPERIENCE_EXPOSED, userId, {
            version: body.version,
            assignedVersion,
            assignmentChangedWhileForegrounded: body.version !== assignedVersion,
            rolloutPercentage: rollout.config.percentage,
            masterEnabled: rollout.masterEnabled,
        });

        return successResponse({ recorded: true, version: body.version });
    } catch (error) {
        return errorResponse(error);
    }
}
