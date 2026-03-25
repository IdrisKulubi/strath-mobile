import { NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { getSessionWithFallback } from "@/lib/auth-helpers";
import { runPairExpiration } from "@/lib/services/pair-expiration-service";
import { profiles } from "@/db/schema";
import { db } from "@/lib/db";

function isAuthorizedInternalRequest(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");

    return !!cronSecret && (bearer === cronSecret || xCronSecret === cronSecret);
}

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

        const result = await runPairExpiration();
        return successResponse(result);
    } catch (error) {
        console.error("[admin/expire-pairs] Error:", error);
        return errorResponse(error);
    }
}
