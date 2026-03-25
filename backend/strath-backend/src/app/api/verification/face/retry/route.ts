import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { retryFaceVerificationSession } from "@/lib/services/face-verification-service";
import { retryFaceVerificationSessionSchema } from "@/lib/validation/face-verification";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json().catch(() => ({}));
        const input = retryFaceVerificationSessionSchema.parse(body);
        const result = await retryFaceVerificationSession(session.user.id, input);

        return successResponse(result, 201);
    } catch (error) {
        return errorResponse(error);
    }
}
