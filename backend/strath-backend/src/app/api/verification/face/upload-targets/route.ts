import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { createFaceVerificationUploadTargets } from "@/lib/services/face-verification-service";
import { createFaceVerificationUploadTargetsSchema } from "@/lib/validation/face-verification";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const input = createFaceVerificationUploadTargetsSchema.parse(body);
        const result = await createFaceVerificationUploadTargets(session.user.id, input);

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}
