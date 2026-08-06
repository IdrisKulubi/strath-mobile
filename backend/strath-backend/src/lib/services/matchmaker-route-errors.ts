import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-response";
import { MatchmakerLlmUnavailableError } from "@/lib/services/matchmaker-llm-client";
import { MatchmakerBriefVersionConflictError } from "@/lib/services/matchmaker-preference-service";

export function matchmakerRouteErrorResponse(error: unknown) {
    if (error instanceof MatchmakerBriefVersionConflictError) {
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                code: error.code,
                data: error.latestBrief,
            },
            { status: 409 },
        );
    }
    if (error instanceof MatchmakerLlmUnavailableError) {
        return NextResponse.json(
            {
                success: false,
                error: error.message,
                code: error.code,
            },
            { status: 503 },
        );
    }

    return errorResponse(error);
}
