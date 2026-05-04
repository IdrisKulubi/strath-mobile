import { NextRequest } from "next/server";
import { and, eq, gte, isNull } from "drizzle-orm";
import { successResponse, errorResponse } from "@/lib/api-response";
import { profiles, user } from "@/db/schema";
import { db } from "@/lib/db";
import { isAuthorizedCronRequest } from "@/lib/security";
import {
    generateCandidatePairsForUser,
    getActiveCandidatePairsForUser,
    promoteDueQueuedPairsForUser,
    sendPendingCandidatePairReminders,
    DAILY_CANDIDATE_PAIR_LIMIT,
} from "@/lib/services/candidate-pairs-service";
import { runPairExpiration } from "@/lib/services/pair-expiration-service";
import { isManualMatchmakingModeEnabled } from "@/lib/services/manual-matchmaking-mode";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
    try {
        if (!isAuthorizedCronRequest(req)) {
            return errorResponse(new Error("Unauthorized"), 401);
        }

        const expiration = await runPairExpiration();
        const reminders = await sendPendingCandidatePairReminders();
        console.log("[cron/candidate-pairs] expired pairs:", expiration.expiredCount);
        console.log("[cron/candidate-pairs] reminders:", reminders);

        if (isManualMatchmakingModeEnabled()) {
            console.log("[cron/candidate-pairs] manual matchmaking mode active - skipping auto generation");
            return successResponse({
                ok: true,
                checkedUsers: 0,
                generatedFor: 0,
                skippedAutoGeneration: true,
                expiration,
                reminders,
            });
        }

        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const limitParam = Number(req.nextUrl.searchParams.get("limit") || "0");
        const runLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : undefined;

        const baseQuery = db
            .select({ id: user.id })
            .from(user)
            .innerJoin(profiles, eq(user.id, profiles.userId))
            .where(
                and(
                    gte(user.lastActive, thirtyDaysAgo),
                    isNull(user.deletedAt),
                ),
            );

        let usersToCheck = runLimit ? await baseQuery.limit(runLimit) : await baseQuery;
        usersToCheck = Array.from(new Map(usersToCheck.map((u) => [u.id, u])).values());

        let generatedFor = 0;
        for (const activeUser of usersToCheck) {
            await promoteDueQueuedPairsForUser(activeUser.id);
            const existingPairs = await getActiveCandidatePairsForUser(activeUser.id);
            if (existingPairs.length >= DAILY_CANDIDATE_PAIR_LIMIT) continue;
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
            reminders,
        });
    } catch (error) {
        console.error("[cron/candidate-pairs] Error:", error);
        return errorResponse(error);
    }
}
