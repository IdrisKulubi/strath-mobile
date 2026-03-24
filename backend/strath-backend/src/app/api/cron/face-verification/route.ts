import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";

import { faceVerificationSessions } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import {
    FACE_VERIFICATION_STATUSES,
    getFaceVerificationCronBatchSize,
    isFaceVerificationExpired,
} from "@/lib/services/face-verification-policy";
import { processFaceVerificationSession } from "@/lib/services/face-verification-processor";
import { expireActiveFaceVerificationSession } from "@/lib/services/face-verification-service";
import { isAuthorizedCronRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleFaceVerificationCron(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const limitParam = Number(req.nextUrl.searchParams.get("limit") || "0");
        const batchSize = Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(Math.floor(limitParam), 100)
            : getFaceVerificationCronBatchSize();

        const processingSessions = await db.query.faceVerificationSessions.findMany({
            where: eq(faceVerificationSessions.status, FACE_VERIFICATION_STATUSES.PROCESSING),
            limit: batchSize,
        });

        const expiredSessions = [];
        const processed = [];

        for (const session of processingSessions) {
            if (isFaceVerificationExpired(session.expiresAt)) {
                const expiredSession = await expireActiveFaceVerificationSession(session.id, session.status);
                expiredSessions.push({
                    sessionId: session.id,
                    status: expiredSession?.status ?? FACE_VERIFICATION_STATUSES.FAILED,
                });
                continue;
            }

            const result = await processFaceVerificationSession(session.id);
            processed.push({
                sessionId: session.id,
                status: result?.status ?? "unknown",
            });
        }

        return successResponse({
            expiredCount: expiredSessions.length,
            expiredSessions,
            batchSize,
            processedCount: processed.length,
            processed,
        });
    } catch (error) {
        return errorResponse(error);
    }
}

export async function GET(req: NextRequest) {
    return handleFaceVerificationCron(req);
}

export async function POST(req: NextRequest) {
    return handleFaceVerificationCron(req);
}
