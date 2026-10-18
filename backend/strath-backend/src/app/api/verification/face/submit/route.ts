import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithBearerFallback } from "@/lib/security";
import { processFaceVerificationSession } from "@/lib/services/face-verification-processor";
import {
    FACE_VERIFICATION_STATUSES,
    getFaceVerificationInlineBudgetMs,
} from "@/lib/services/face-verification-policy";
import { completePendingFaceVerificationSessionJob } from "@/lib/services/face-verification-queue";
import {
    getFaceVerificationSessionByIdForUser,
    submitFaceVerificationSession,
} from "@/lib/services/face-verification-service";
import { submitFaceVerificationSessionSchema } from "@/lib/validation/face-verification";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const DUPLICATE_SUBMIT_WINDOW_MS = 90_000;

class InlineProcessingBudgetExceededError extends Error {
    constructor() {
        super("Inline processing budget exceeded");
        this.name = "InlineProcessingBudgetExceededError";
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await getSessionWithBearerFallback(req);
        if (!session?.user) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = await req.json();
        const input = submitFaceVerificationSessionSchema.parse(body);

        const existingSession = await getFaceVerificationSessionByIdForUser(
            session.user.id,
            input.sessionId,
        );

        if (
            existingSession?.status === FACE_VERIFICATION_STATUSES.PROCESSING &&
            isRecentDuplicateSubmit(existingSession.updatedAt)
        ) {
            const workerTriggered = await triggerFaceVerificationWorker(req);

            return successResponse({
                session: existingSession,
                queued: true,
                processedInline: false,
                duplicateSubmit: true,
                workerTriggered,
            });
        }

        const result = await submitFaceVerificationSession(session.user.id, input);

        try {
            const processedSession = await processInlineWithBudget(result.session.id);
            await completePendingFaceVerificationSessionJob(result.session.id);

            return successResponse({
                ...result,
                queued: false,
                processedInline: true,
                session: processedSession ?? result.session,
            });
        } catch (processingError) {
            console.error("[FaceVerification] Inline processing failed after submit", {
                sessionId: result.session.id,
                error: processingError,
            });

            if (shouldDeferToQueue(processingError)) {
                const workerTriggered = await triggerFaceVerificationWorker(req);

                return successResponse({
                    ...result,
                    queued: true,
                    processedInline: false,
                    workerTriggered,
                });
            }

            throw processingError;
        }
    } catch (error) {
        return errorResponse(error);
    }
}

function isRecentDuplicateSubmit(updatedAt: Date | string) {
    const updatedMs = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
    if (Number.isNaN(updatedMs)) {
        return false;
    }

    return Date.now() - updatedMs < DUPLICATE_SUBMIT_WINDOW_MS;
}

async function processInlineWithBudget(sessionId: string) {
    const budgetMs = getFaceVerificationInlineBudgetMs();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const budgetPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new InlineProcessingBudgetExceededError());
        }, budgetMs);
    });

    try {
        return await Promise.race([processFaceVerificationSession(sessionId), budgetPromise]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

function shouldDeferToQueue(error: unknown) {
    if (error instanceof InlineProcessingBudgetExceededError) {
        return true;
    }

    if (!(error instanceof Error)) {
        return false;
    }

    const normalizedMessage = error.message.toLowerCase();
    return (
        normalizedMessage.includes("timeout") ||
        normalizedMessage.includes("timed out") ||
        normalizedMessage.includes("econnreset") ||
        normalizedMessage.includes("socket hang up") ||
        normalizedMessage.includes("throttl") ||
        normalizedMessage.includes("rate exceeded") ||
        normalizedMessage.includes("service unavailable") ||
        normalizedMessage.includes("internalerror") ||
        normalizedMessage.includes("too many requests")
    );
}

async function triggerFaceVerificationWorker(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET?.trim();
    if (!cronSecret) {
        return false;
    }

    try {
        const workerUrl = new URL("/api/worker/face-verification?limit=1", req.nextUrl.origin);
        const response = await fetch(workerUrl, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${cronSecret}`,
            },
            cache: "no-store",
        });

        return response.ok;
    } catch (error) {
        console.error("[FaceVerification] Failed to trigger worker after submit", error);
        return false;
    }
}
