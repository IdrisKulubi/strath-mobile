import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { MATCHMAKER_PREFERENCE_CATEGORIES } from "@/lib/matchmaker/preference-domain";
import { getSessionWithBearerFallback } from "@/lib/security";
import { requireMatchmakerBriefAccess } from "@/lib/services/matchmaker-brief-access";
import {
    getMatchmakerBrief,
    mutateMatchmakerBrief,
} from "@/lib/services/matchmaker-preference-service";
import { matchmakerRouteErrorResponse } from "@/lib/services/matchmaker-route-errors";
import { trackMatchmakerEvent } from "@/lib/services/matchmaker-analytics-service";

export const dynamic = "force-dynamic";

const preferenceId = z.string().uuid();
const operationSchema = z.discriminatedUnion("type", [
    z.object({
        type: z.literal("add"),
        category: z.enum(MATCHMAKER_PREFERENCE_CATEGORIES),
        value: z.string().trim().min(1).max(120),
        sentiment: z.enum(["prefer", "avoid"]).optional(),
        importance: z.enum(["must_have", "prefer", "flexible"]).optional(),
        certainty: z.enum(["confirmed", "inferred"]).optional(),
        source: z.enum(["direct", "feedback", "migrated_memory", "system"]).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }),
    z.object({
        type: z.literal("update"),
        preferenceId,
        value: z.string().trim().min(1).max(120).optional(),
        sentiment: z.enum(["prefer", "avoid"]).optional(),
        metadata: z.record(z.string(), z.unknown()).optional(),
    }).refine((value) => value.value !== undefined || value.sentiment !== undefined || value.metadata !== undefined, {
        message: "Update requires at least one changed field",
    }),
    z.object({ type: z.literal("confirm"), preferenceId }),
    z.object({
        type: z.literal("reclassify"),
        preferenceId,
        importance: z.enum(["must_have", "prefer", "flexible"]),
    }),
    z.object({ type: z.literal("remove"), preferenceId }),
]);

const patchSchema = z.object({
    baseVersion: z.number().int().nonnegative(),
    operations: z.array(operationSchema).min(1).max(20),
});

async function authenticatedUserId(req: NextRequest) {
    const session = await getSessionWithBearerFallback(req);
    return session?.user?.id ?? null;
}

export async function GET(req: NextRequest) {
    try {
        const userId = await authenticatedUserId(req);
        if (!userId) return errorResponse(new Error("Unauthorized"), 401);
        const denied = await requireMatchmakerBriefAccess(userId);
        if (denied) return denied;
        const brief = await getMatchmakerBrief(userId);
        trackMatchmakerEvent({ event: "brief_viewed", userId, metadata: { version: brief.version } }).catch(() => undefined);
        return successResponse(brief);
    } catch (error) {
        console.error("[matchmaker/brief] GET error:", error);
        return matchmakerRouteErrorResponse(error);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const userId = await authenticatedUserId(req);
        if (!userId) return errorResponse(new Error("Unauthorized"), 401);
        const denied = await requireMatchmakerBriefAccess(userId);
        if (denied) return denied;
        const body = patchSchema.parse(await req.json());
        return successResponse(await mutateMatchmakerBrief({
            userId,
            baseVersion: body.baseVersion,
            operations: body.operations,
            metadata: { source: "brief_editor" },
        }));
    } catch (error) {
        console.error("[matchmaker/brief] PATCH error:", error);
        return matchmakerRouteErrorResponse(error);
    }
}
