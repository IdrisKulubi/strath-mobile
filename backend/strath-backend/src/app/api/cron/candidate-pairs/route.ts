import { NextRequest } from "next/server";
import { and, gte, isNull } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { user } from "@/db/schema";
import { db } from "@/lib/db";
import {
    generateCandidatePairsForUser,
    getActiveCandidatePairsForUser,
} from "@/lib/services/candidate-pairs-service";
import { runPairExpiration } from "@/lib/services/pair-expiration-service";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorizedCron(req: NextRequest) {
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
    const xCronSecret = req.headers.get("x-cron-secret");
    const isVercelCron = req.headers.get("x-vercel-cron") === "1";

    if (!cronSecret) {
        return isVercelCron;
    }

    return bearer === cronSecret || xCronSecret === cronSecret || isVercelCron;
}

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCron(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const expiration = await runPairExpiration();
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const limitParam = Number(req.nextUrl.searchParams.get("limit") || "0");
        const runLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : undefined;

        const baseQuery = db
            .select({ id: user.id })
            .from(user)
            .where(
                and(
                    gte(user.lastActive, thirtyDaysAgo),
                    isNull(user.deletedAt),
                ),
            );

        const usersToCheck = runLimit ? await baseQuery.limit(runLimit) : await baseQuery;

        let generatedFor = 0;
        for (const activeUser of usersToCheck) {
            const existingPairs = await getActiveCandidatePairsForUser(activeUser.id);
            if (existingPairs.length > 0) continue;
            const created = await generateCandidatePairsForUser(activeUser.id);
            if (created.length > 0) {
                generatedFor++;
            }
        }

        return successResponse({
            ok: true,
            checkedUsers: usersToCheck.length,
            generatedFor,
            expiration,
        });
    } catch (error) {
        console.error("[cron/candidate-pairs] Error:", error);
        return errorResponse(error);
    }
}
