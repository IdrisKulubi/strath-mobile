import { and, eq, gte, lt, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { agentAnalytics } from "@/db/schema";
import { AGENT_DAILY_SEARCH_LIMIT } from "@/lib/config/agent";

function getUtcDayBounds(now: Date) {
    const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const nextDayStart = new Date(dayStart);
    nextDayStart.setUTCDate(nextDayStart.getUTCDate() + 1);
    return { dayStart, nextDayStart };
}

export async function getAgentSearchQuota(userId: string) {
    const now = new Date();
    const { dayStart, nextDayStart } = getUtcDayBounds(now);

    const rows = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(agentAnalytics)
        .where(
            and(
                eq(agentAnalytics.userId, userId),
                gte(agentAnalytics.createdAt, dayStart),
                lt(agentAnalytics.createdAt, nextDayStart),
                sql`${agentAnalytics.eventType} in ('agent_search', 'agent_refine')`,
            ),
        );

    const used = Number(rows[0]?.count ?? 0);
    const limit = AGENT_DAILY_SEARCH_LIMIT;
    const remaining = Math.max(limit - used, 0);

    return {
        used,
        limit,
        remaining,
        isExhausted: remaining <= 0,
        resetsAt: nextDayStart.toISOString(),
    };
}

export async function trackAgentSearchUsage(
    userId: string,
    eventType: "agent_search" | "agent_refine",
    metadata?: Record<string, unknown>,
) {
    await db.insert(agentAnalytics).values({
        userId,
        eventType,
        metadata: metadata ?? {},
    });
}
