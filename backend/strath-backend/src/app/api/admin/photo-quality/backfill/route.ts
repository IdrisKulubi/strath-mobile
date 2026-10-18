import { NextRequest } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";

import { profiles } from "@/db/schema";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { backfillPhotoEmbeddings } from "@/lib/services/photo-intelligence-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const bodySchema = z.object({
    limit: z.number().int().min(1).max(100).optional(),
    offset: z.number().int().min(0).optional(),
    userId: z.string().min(1).optional(),
    onlyMissingEmbeddings: z.boolean().optional(),
});

function isAuthorizedInternalRequest(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    return !!cronSecret && (bearer === cronSecret || xCronSecret === cronSecret);
}

/**
 * POST /api/admin/photo-quality/backfill
 *
 * Analyze profile photos and fill profile_photo_embeddings via Railway worker.
 * Call repeatedly with increasing offset until nextOffset is null.
 */
export async function POST(req: NextRequest) {
    try {
        let isAdmin = false;
        const session = await getSessionWithFallback(req);
        if (session?.user?.id) {
            const profile = await db.query.profiles.findFirst({
                where: eq(profiles.userId, session.user.id),
            });
            isAdmin = profile?.role === "admin";
        }

        if (!isAdmin && !isAuthorizedInternalRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const body = req.headers.get("content-length") === "0"
            ? {}
            : bodySchema.parse(await req.json().catch(() => ({})));

        const result = await backfillPhotoEmbeddings(body);
        return successResponse(result);
    } catch (error) {
        console.error("[admin/photo-quality/backfill] Error:", error);
        return errorResponse(error);
    }
}
