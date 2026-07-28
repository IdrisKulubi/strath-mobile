import { NextResponse } from "next/server";

import { errorResponse } from "@/lib/api-response";
import { MatchmakerLlmUnavailableError } from "@/lib/services/matchmaker-llm-client";

export function matchmakerRouteErrorResponse(error: unknown) {
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
