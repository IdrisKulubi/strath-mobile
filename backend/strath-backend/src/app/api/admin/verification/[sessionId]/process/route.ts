import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/security";
import { processFaceVerificationSession } from "@/lib/services/face-verification-processor";

type RouteContext = {
    params: Promise<{
        sessionId: string;
    }>;
};

export async function POST(req: NextRequest, context: RouteContext) {
    try {
        const session = await requireAdminApiSession(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized: Admin only"), 403);
        }

        const { sessionId } = await context.params;
        const updatedSession = await processFaceVerificationSession(sessionId);

        return successResponse(updatedSession);
    } catch (error) {
        return errorResponse(error);
    }
}
