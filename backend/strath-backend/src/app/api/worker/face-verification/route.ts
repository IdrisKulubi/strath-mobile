import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getFaceVerificationWorkerBatchSize } from "@/lib/services/face-verification-policy";
import { processFaceVerificationJobBatch } from "@/lib/services/face-verification-worker";
import { isAuthorizedCronRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

async function handleFaceVerificationWorker(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const limitParam = Number(req.nextUrl.searchParams.get("limit") || "0");
        const batchSize = Number.isFinite(limitParam) && limitParam > 0
            ? Math.min(Math.floor(limitParam), 100)
            : getFaceVerificationWorkerBatchSize();

        const result = await processFaceVerificationJobBatch({
            batchSize,
        });

        return successResponse(result);
    } catch (error) {
        return errorResponse(error);
    }
}

export async function GET(req: NextRequest) {
    return handleFaceVerificationWorker(req);
}

export async function POST(req: NextRequest) {
    return handleFaceVerificationWorker(req);
}
