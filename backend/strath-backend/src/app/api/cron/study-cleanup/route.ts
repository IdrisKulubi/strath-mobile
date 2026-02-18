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

export async function GET(req: NextRequest) {
    // Validate cron secret
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return errorResponse("Unauthorized", 401);
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
