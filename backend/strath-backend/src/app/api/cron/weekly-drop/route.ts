import { NextRequest } from "next/server";
import { and, eq, gte, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { user, weeklyDrops } from "@/db/schema";
import { successResponse, errorResponse } from "@/lib/api-response";
import { parseIntent, embedIntent } from "@/services/intent-parser";
import { agentSearch } from "@/services/agent-search";
import { rankCandidates } from "@/services/ranking-service";
import { generateQuickExplanations } from "@/services/explanation-service";
import { getAgentContext } from "@/services/agent-context";
import { sendPushNotification } from "@/lib/notifications";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type DropCandidate = {
    userId: string;
    score: number;
    reasons: string[];
    starters: string[];
};

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

function getNairobiNow() {
    return new Date(new Date().toLocaleString("en-US", { timeZone: "Africa/Nairobi" }));
}

function getIsoWeekNumber(date: Date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getDropNumber(date: Date) {
    const week = getIsoWeekNumber(date);
    return date.getFullYear() * 100 + week;
}

function buildQueryFromLearnedPrefs(learnedPreferences: Record<string, number> | undefined) {
    if (!learnedPreferences || Object.keys(learnedPreferences).length === 0) {
        return "find me compatible people";
    }

    const topTraits = Object.entries(learnedPreferences)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([key]) => key.replace(/_/g, " "));

    if (topTraits.length === 0) return "find me compatible people";

    return `find me compatible people who are ${topTraits.join(", ")}`;
}

export async function GET(request: NextRequest) {
    try {
        if (!isAuthorizedCron(request)) {
            return errorResponse("Unauthorized cron request", 401);
        }

        const now = new Date();
        const nairobiNow = getNairobiNow();
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const expiresAt = new Date(now.getTime() + 48 * 60 * 60 * 1000);
        const dropNumber = getDropNumber(nairobiNow);

        const limitParam = Number(request.nextUrl.searchParams.get("limit") || "0");
        const runLimit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 1000) : undefined;

        const activeUsersBaseQuery = db
            .select({ id: user.id, pushToken: user.pushToken })
            .from(user)
            .where(and(
                gte(user.lastActive, fourteenDaysAgo),
                isNull(user.deletedAt),
            ));

        const activeUsers = runLimit
            ? await activeUsersBaseQuery.limit(runLimit)
            : await activeUsersBaseQuery;

        let processed = 0;
        let failed = 0;
        let notificationsSent = 0;
        let emptyResults = 0;

        for (const activeUser of activeUsers) {
            try {
                const ctx = await getAgentContext(activeUser.id);
                const query = buildQueryFromLearnedPrefs(ctx.learnedPreferences);

                const intent = await parseIntent(query, null, ctx.learnedPreferences || {});
                const intentEmbedding = await embedIntent(intent);

                const search = await agentSearch(activeUser.id, intent, intentEmbedding, 20, 0, []);
                const ranked = rankCandidates(search.candidates, intent, ctx.learnedPreferences || {});

                if (ranked.length === 0) {
                    emptyResults++;
                    continue;
                }

                const desiredCount = Math.min(7, ranked.length);
                const finalCount = ranked.length >= 3 ? desiredCount : ranked.length;
                const selected = ranked.slice(0, finalCount);
                const explanations = generateQuickExplanations(selected, intent);

                const matchedUserIds = selected.map((candidate) => candidate.profile.userId);
                const matchData: DropCandidate[] = selected.map((candidate, index) => ({
                    userId: candidate.profile.userId,
                    score: candidate.scores.total,
                    reasons: candidate.matchReasons.slice(0, 3),
                    starters: explanations[index]?.conversationStarters?.slice(0, 3) || [],
                }));

                const existing = await db.query.weeklyDrops.findFirst({
                    where: and(
                        eq(weeklyDrops.userId, activeUser.id),
                        eq(weeklyDrops.dropNumber, dropNumber),
                    ),
                });

                if (existing) {
                    await db
                        .update(weeklyDrops)
                        .set({
                            matchedUserIds,
                            matchData,
                            status: "delivered",
                            deliveredAt: now,
                            openedAt: null,
                            expiresAt,
                        })
                        .where(eq(weeklyDrops.id, existing.id));
                } else {
                    await db.insert(weeklyDrops).values({
                        userId: activeUser.id,
                        matchedUserIds,
                        matchData,
                        dropNumber,
                        status: "delivered",
                        deliveredAt: now,
                        expiresAt,
                    });
                }

                if (activeUser.pushToken) {
                    await sendPushNotification(
                        activeUser.pushToken,
                        "Your weekly matches are here! 🎯",
                        {
                            type: "weekly_drop",
                            dropNumber,
                        },
                    );
                    notificationsSent++;
                }

                processed++;
            } catch (err) {
                failed++;
                console.error("[WeeklyDrop Cron] Failed user:", activeUser.id, err);
            }
        }

        return successResponse({
            ok: true,
            dropNumber,
            activeUsers: activeUsers.length,
            processed,
            failed,
            emptyResults,
            notificationsSent,
            expiresAt: expiresAt.toISOString(),
            timezone: "Africa/Nairobi",
            schedule: "Sunday 7:00 PM EAT (configure in Vercel cron)",
        });
    } catch (error) {
        console.error("[WeeklyDrop Cron] Error:", error);
        return errorResponse("Failed to generate weekly drops", 500);
    }
}
