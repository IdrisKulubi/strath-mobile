import { NextRequest } from "next/server";
import { z } from "zod";

import { errorResponse, successResponse } from "@/lib/api-response";
import { requireAdminApiSession } from "@/lib/security";
import { markFaceVerificationSessionReviewed } from "@/lib/services/face-verification-service";

const reviewFaceVerificationSchema = z.object({
    status: z.enum(["verified", "manual_review", "failed", "blocked"]),
    reason: z.string().trim().min(3).max(200),
});

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
        const body = await req.json();
        const input = reviewFaceVerificationSchema.parse(body);
        const updatedSession = await markFaceVerificationSessionReviewed(
            sessionId,
            input.status,
            input.reason,
        );

        return successResponse(updatedSession);
    } catch (error) {
        return errorResponse(error);
    }
}
