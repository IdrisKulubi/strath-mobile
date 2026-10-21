import { NextRequest } from "next/server";
import { getSessionWithBearerFallback } from "@/lib/security";
import { successResponse, errorResponse } from "@/lib/api-response";
import { logEvent, EVENT_TYPES } from "@/lib/analytics";
import { z } from "zod";

const outcomeSchema = z.object({
    context: z.enum(["mutual_match", "after_confirm", "settings", "reminder"]),
    outcome: z.enum(["accepted", "dismissed"]),
});

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) return errorResponse(new Error("Unauthorized"), 401);

        const body = await req.json();
        const { context, outcome } = outcomeSchema.parse(body);

        await logEvent(EVENT_TYPES.PUSH_PRE_PROMPT, session.user.id, {
            context,
            outcome,
        });

        return successResponse({ success: true });
    } catch (error) {
        return errorResponse(error);
    }
}
