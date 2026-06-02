import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { submitFaceVerificationAssistance } from "@/lib/services/face-verification-assistance-service";
import { submitFaceVerificationAssistanceSchema } from "@/lib/validation/face-verification";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user?.id) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const json = await req.json();
        const parsed = submitFaceVerificationAssistanceSchema.parse(json);
        const result = await submitFaceVerificationAssistance(session.user.id, parsed);

        return successResponse(result);
    } catch (error) {
        console.error("[FaceVerificationAssistance] Error:", error);
        return errorResponse(error);
    }
}
