import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getFaceVerificationSessionByIdForUser } from "@/lib/services/face-verification-service";
import { getSessionWithBearerFallback } from "@/lib/security";

type RouteContext = {
    params: Promise<{
        sessionId: string;
    }>;
};

export async function GET(req: NextRequest, context: RouteContext) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const { sessionId } = await context.params;
        const verificationSession = await getFaceVerificationSessionByIdForUser(session.user.id, sessionId);

        if (!verificationSession) {
            return errorResponse(new Error("Verification session not found"), 404);
        }

        return successResponse(verificationSession);
    } catch (error) {
        return errorResponse(error);
    }
}
