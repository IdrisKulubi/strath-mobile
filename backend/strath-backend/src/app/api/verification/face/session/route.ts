import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import {
    createFaceVerificationSession,
    getLatestFaceVerificationSession,
} from "@/lib/services/face-verification-service";
import { createFaceVerificationSessionSchema } from "@/lib/validation/face-verification";
import { getSessionWithBearerFallback } from "@/lib/security";

export async function GET(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const verificationSession = await getLatestFaceVerificationSession(session.user.id);
        return successResponse(verificationSession);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json().catch(() => ({}));
        const input = createFaceVerificationSessionSchema.parse(body);
        const verificationSession = await createFaceVerificationSession(session.user.id, input);

        return successResponse(verificationSession, 201);
    } catch (error) {
        return errorResponse(error);
    }
}
