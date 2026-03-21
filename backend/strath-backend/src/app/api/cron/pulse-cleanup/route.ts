import { NextRequest } from "next/server";
import { and, eq, lt, or } from "drizzle-orm";

import { pulsePosts } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { db } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/security";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse("Unauthorized cron request", 401);
        }

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const deleted = await db
            .delete(pulsePosts)
            .where(
                or(
                    lt(pulsePosts.expiresAt, new Date(now.getTime() - 60 * 60 * 1000)),
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
