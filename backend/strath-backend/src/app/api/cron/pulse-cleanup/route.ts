/**
 * Pulse Cleanup Cron
 *
 * GET /api/cron/pulse-cleanup
 *
 * Runs every 6 hours (configured in vercel.json / cron config).
 * Hard-deletes pulse posts that are:
 *   - expired (expiresAt < NOW)  OR
 *   - soft-hidden (isHidden = true) older than 24 hours
 *
 * Also hard-deletes associated reactions (cascaded by DB FK).
 */
import { NextRequest } from "next/server";
import { and, eq, lt, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { pulsePosts } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// ─── Auth helper ──────────────────────────────────────────────────────────────

function isAuthorizedCron(req: NextRequest): boolean {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") ?? "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

    if (!cronSecret) return isVercelCron;
    return bearer === cronSecret || xCronSecret === cronSecret || isVercelCron;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCron(req)) {
            return errorResponse("Unauthorized cron request", 401);
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // Delete expired posts and soft-hidden posts older than 24h
        const deleted = await db
            .delete(pulsePosts)
            .where(
                or(
                    // Expired posts — grace period: allow 1h before hard delete
                    lt(pulsePosts.expiresAt, new Date(now.getTime() - 60 * 60 * 1000)),
                    // Soft-hidden posts older than 24h
                    and(eq(pulsePosts.isHidden, true), lt(pulsePosts.createdAt, oneDayAgo))
                )
            )
            .returning({ id: pulsePosts.id });

        console.log(`[pulse-cleanup] Deleted ${deleted.length} posts`);

        return successResponse({
            deletedCount: deleted.length,
            ranAt: now.toISOString(),
        });
    } catch (error) {
        console.error("[pulse-cleanup] Error:", error);
        return errorResponse("Cleanup failed", 500);
    }
}
