import { NextRequest } from "next/server";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { matchHoldCancelSchema } from "@/lib/validation";
import { cancelMatchHold } from "@/lib/services/match-hold-service";

export const dynamic = "force-dynamic";

/**
 * POST /api/me/match-hold/cancel
 * Body: { mutualMatchId, reason, notes? }
 *
 * User-initiated cancellation of an active match hold (mutual / arrangement / upcoming date).
 * Releases the user back into normal daily matching.
 */
export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const json = await req.json();
        const mutualMatchId =
            typeof json?.mutualMatchId === "string" ? json.mutualMatchId : null;
        if (!mutualMatchId) {
            return errorResponse(new Error("mutualMatchId is required"), 400);
        }

        const parsed = matchHoldCancelSchema.parse({
            reason: json?.reason,
            notes: json?.notes ?? null,
        });

        const result = await cancelMatchHold(session.user.id, mutualMatchId, parsed);

        if (result.status === "not_found") {
            return errorResponse(new Error("Mutual match not found"), 404);
        }
        if (result.status === "forbidden") {
            return errorResponse(new Error("You do not belong to this mutual"), 403);
        }

        return successResponse({ status: result.status });
    } catch (error) {
        console.error("[me/match-hold/cancel] Error:", error);
        return errorResponse(error);
    }
}
