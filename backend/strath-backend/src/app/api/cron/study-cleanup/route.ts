/**
 * Study Session Cleanup Cron
 *
 * Hard-deactivates sessions that have passed their availableUntil time.
 * Scheduled every hour via vercel.json cron.
 *
 * GET /api/cron/study-cleanup
 */
import { NextRequest } from "next/server";
import { and, eq, lt } from "drizzle-orm";

import { db } from "@/lib/db";
import { studySessions } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

function isAuthorizedCron(req: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

    if (!cronSecret) return isVercelCron;
    return bearer === cronSecret || xCronSecret === cronSecret || isVercelCron;
}

export async function GET(req: NextRequest) {
    if (!isAuthorizedCron(req)) {
        return errorResponse(new Error("Unauthorized"), 401);
    }

    try {
        const now = new Date();

        const result = await db
            .update(studySessions)
            .set({ isActive: false })
            .where(
                and(
                    eq(studySessions.isActive, true),
                    lt(studySessions.availableUntil, now),
                )
            )
            .returning({ id: studySessions.id });

        console.log(`[study-cleanup] Deactivated ${result.length} expired sessions`);

        return successResponse({ deactivated: result.length });
    } catch (error) {
        console.error("[study-cleanup] Error:", error);
        return errorResponse("Cleanup failed", 500);
    }
}
