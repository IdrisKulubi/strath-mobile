import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { processFaceVerificationSession } from "@/lib/services/face-verification-processor";
import { getFaceVerificationProcessingMode } from "@/lib/services/face-verification-policy";
import { submitFaceVerificationSession } from "@/lib/services/face-verification-service";
import { submitFaceVerificationSessionSchema } from "@/lib/validation/face-verification";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const input = submitFaceVerificationSessionSchema.parse(body);
        const result = await submitFaceVerificationSession(session.user.id, input);

        if (getFaceVerificationProcessingMode() === "async") {
            return successResponse({
                ...result,
                queued: true,
            });
        }

        const processedSession = await processFaceVerificationSession(result.session.id);

        return successResponse({
            ...result,
            queued: false,
            session: processedSession ?? result.session,
        });
    } catch (error) {
        return errorResponse(error);
    }
}
