import { NextRequest } from "next/server";
import { z } from "zod";

import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { getOrCreateMatchPreferences, updateMatchPreferences } from "@/lib/services/match-intelligence-service";

export const dynamic = "force-dynamic";

const preferenceSchema = z.object({
    preferenceMode: z.enum(["similar_to_me", "different_from_me", "surprise_me", "active_only", "serious_matches"]).optional(),
    availableNow: z.boolean().optional(),
    availableToday: z.boolean().optional(),
    openToCalls: z.boolean().optional(),
    preferredAgeMin: z.number().int().min(18).max(99).nullable().optional(),
    preferredAgeMax: z.number().int().min(18).max(99).nullable().optional(),
    preferredUniversities: z.array(z.string().trim().min(1)).max(20).optional(),
    preferredContactWindow: z.string().trim().max(120).nullable().optional(),
});

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const preferences = await getOrCreateMatchPreferences(session.user.id);
        return successResponse({ preferences });
    } catch (error) {
        console.error("[match-preferences] GET Error:", error);
        return errorResponse(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = preferenceSchema.parse(await req.json());
        if (
            body.preferredAgeMin != null &&
            body.preferredAgeMax != null &&
            body.preferredAgeMin > body.preferredAgeMax
        ) {
            return errorResponse(new Error("preferredAgeMin cannot be greater than preferredAgeMax"), 400);
        }

        const preferences = await updateMatchPreferences(session.user.id, body);
        return successResponse({ preferences });
    } catch (error) {
        console.error("[match-preferences] POST Error:", error);
        return errorResponse(error);
    }
}
