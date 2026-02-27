import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/lib/db";
import { agentAnalytics } from "@/db/schema";
import { AGENT_DAILY_SEARCH_LIMIT } from "@/lib/config/agent";

export async function getAgentSearchQuota(userId: string) {
    const rows = await db
        .select({
            count: sql<number>`count(*)::int`,
            resetsAt: sql<string>`(date_trunc('day', timezone('utc', now())) + interval '1 day')::text`,
        })
        .from(agentAnalytics)
        .where(
            and(
                eq(agentAnalytics.userId, userId),
                inArray(agentAnalytics.eventType, ["agent_search", "agent_refine"]),
                sql`${agentAnalytics.createdAt} >= date_trunc('day', timezone('utc', now()))`,
                sql`${agentAnalytics.createdAt} < date_trunc('day', timezone('utc', now())) + interval '1 day'`,
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
        resetsAt: rows[0]?.resetsAt ?? null,
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
