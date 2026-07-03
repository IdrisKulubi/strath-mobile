import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/api-response";
import { isAuthorizedCronRequest } from "@/lib/security";
import {
    backfillProfileIntelligence,
    runProfileIntelligenceJobs,
} from "@/lib/services/profile-intelligence-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const limitParam = Number(req.nextUrl.searchParams.get("limit") || "10");
        const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 50) : 10;
        const enqueueMissing = req.nextUrl.searchParams.get("enqueueMissing") === "true";

        const jobs = await runProfileIntelligenceJobs({ limit });
        const enqueued = enqueueMissing
            ? await backfillProfileIntelligence({
                limit,
                enqueueOnly: true,
                onlyStale: true,
            })
            : null;

        console.log("[cron/profile-intelligence]", {
            jobs,
            enqueued: enqueued
                ? {
                    processed: enqueued.processed,
                    queued: enqueued.queued,
                    failed: enqueued.failed,
                    hasMore: enqueued.hasMore,
                }
                : null,
        });

        return successResponse({
            ok: true,
            jobs,
            enqueued,
        });
    } catch (error) {
        console.error("[cron/profile-intelligence] Error:", error);
        return errorResponse(error);
    }
}
