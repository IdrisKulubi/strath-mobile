import { eq, or } from "drizzle-orm";

import { candidatePairs } from "@/db/schema";
import { db as readDb } from "@/lib/db";
import type { PairAggregateSnapshot } from "@/lib/matching/candidate-pool-policy";

function getOtherUserId(pair: { userAId: string; userBId: string }, userId: string) {
    return pair.userAId === userId ? pair.userBId : pair.userAId;
}

/**
 * Aggregates all candidate_pairs rows per (userId, otherUserId).
 * closed/mutual = never recreate this dyad. active/queued = already in flight.
 * expired = cooldown applies before re-pairing the same two people.
 */
export async function getExistingPairMap(userId: string): Promise<Map<string, PairAggregateSnapshot>> {
    const rows = await readDb
        .select()
        .from(candidatePairs)
        .where(
            or(
                eq(candidatePairs.userAId, userId),
                eq(candidatePairs.userBId, userId),
            ),
        );

    const byOther = new Map<string, PairAggregateSnapshot>();

    for (const row of rows) {
        const other = getOtherUserId(row, userId);
        const existing = byOther.get(other) ?? {
            hasClosedOrMutual: false,
            hasActive: false,
            oldestExpiredCreatedAt: null as Date | null,
        };

        if (row.status === "closed" || row.status === "mutual") existing.hasClosedOrMutual = true;
        if (row.status === "active" || row.status === "queued") existing.hasActive = true;
        if (row.status === "expired") {
            const expiredAt = row.updatedAt ?? row.createdAt;
            existing.oldestExpiredCreatedAt =
                !existing.oldestExpiredCreatedAt || expiredAt > existing.oldestExpiredCreatedAt
                    ? expiredAt
                    : existing.oldestExpiredCreatedAt;
        }

        byOther.set(other, existing);
    }

    return byOther;
}
