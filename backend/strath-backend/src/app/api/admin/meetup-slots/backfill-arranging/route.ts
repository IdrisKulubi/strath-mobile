import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { profiles } from "@/db/schema";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { backfillArrangingMeetupSlots } from "@/lib/services/meetup-backfill-service";

export const dynamic = "force-dynamic";

function isAuthorizedInternalRequest(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    return !!cronSecret && (bearer === cronSecret || xCronSecret === cronSecret);
}

/**
 * POST /api/admin/meetup-slots/backfill-arranging
 *
 * One-shot: assign this week's Wednesday 17:30 EAT to all being_arranged matches
 * and reset slot confirmations so both users must confirm in-app.
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

        const result = await backfillArrangingMeetupSlots();
        return successResponse(result);
    } catch (error) {
        console.error("[admin/meetup-slots/backfill-arranging] Error:", error);
        return errorResponse(error);
    }
}
