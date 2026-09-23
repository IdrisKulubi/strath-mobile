import type { QueryResultRow } from "pg";

import { query, type SqlExecutor } from "./db";

type LegacyRow = QueryResultRow & {
    id: string;
    userA: string;
    userB: string;
    status: string;
    matchId: string | null;
    blocked: boolean;
    unavailable: boolean;
};

export type BackfillReport = {
    scanned: number;
    eligible: number;
    wouldInsert: number;
    inserted: number;
    alreadyPresent: number;
    excludedInactive: number;
    excludedBlockedOrDeleted: number;
    excludedMissingConversation: number;
    matchCountBefore: number;
    matchCountAfter: number;
    messageCountBefore: number;
    messageCountAfter: number;
    apply: boolean;
};

const ACTIVE_LEGACY_STATUSES = new Set(["mutual", "being_arranged", "upcoming", "completed"]);

async function count(executor: SqlExecutor, table: "matches" | "messages") {
    const [row] = await query<{ count: number } & QueryResultRow>(`SELECT count(*)::int AS count FROM ${table}`, [], executor);
    return row?.count ?? 0;
}

export async function reconcileLegacyConnections(executor: SqlExecutor, apply: boolean): Promise<BackfillReport> {
    const matchCountBefore = await count(executor, "matches");
    const messageCountBefore = await count(executor, "messages");
    const rows = await query<LegacyRow>(`
        SELECT legacy.id,
               LEAST(legacy.user_a_id, legacy.user_b_id) AS "userA",
               GREATEST(legacy.user_a_id, legacy.user_b_id) AS "userB",
               legacy.status, legacy.legacy_match_id AS "matchId",
               EXISTS(SELECT 1 FROM blocks block
                      WHERE (block.blocker_id = legacy.user_a_id AND block.blocked_id = legacy.user_b_id)
                         OR (block.blocked_id = legacy.user_a_id AND block.blocker_id = legacy.user_b_id)) AS blocked,
               EXISTS(SELECT 1 FROM "user" account
                      WHERE account.id IN (legacy.user_a_id, legacy.user_b_id)
                        AND (account.deleted_at IS NOT NULL OR account.deleted_reason IS NOT NULL)) AS unavailable
        FROM mutual_matches legacy
        ORDER BY legacy.created_at, legacy.id
    `, [], executor);

    const eligibleByPair = new Map<string, LegacyRow>();
    let excludedInactive = 0;
    let excludedBlockedOrDeleted = 0;
    let excludedMissingConversation = 0;
    for (const row of rows) {
        if (!ACTIVE_LEGACY_STATUSES.has(row.status)) {
            excludedInactive += 1;
            continue;
        }
        if (row.blocked || row.unavailable) {
            excludedBlockedOrDeleted += 1;
            continue;
        }
        if (!row.matchId) {
            excludedMissingConversation += 1;
            continue;
        }
        const key = `${row.userA}\0${row.userB}`;
        if (!eligibleByPair.has(key)) eligibleByPair.set(key, row);
    }

    let inserted = 0;
    let wouldInsert = 0;
    let alreadyPresent = 0;
    for (const row of eligibleByPair.values()) {
        const existing = await query(`
            SELECT 1 FROM q_connections WHERE user_a = $1 AND user_b = $2
        `, [row.userA, row.userB], executor);
        if (existing.length > 0) {
            alreadyPresent += 1;
            continue;
        }
        wouldInsert += 1;
        if (apply) {
            await query(`
                INSERT INTO q_connections(
                    user_a, user_b, match_id, status, origin, connected_at, created_at, updated_at
                ) VALUES($1, $2, $3, 'active', 'legacy', now(), now(), now())
                ON CONFLICT DO NOTHING
            `, [row.userA, row.userB, row.matchId], executor);
            inserted += 1;
        }
    }

    return {
        scanned: rows.length,
        eligible: eligibleByPair.size,
        wouldInsert,
        inserted,
        alreadyPresent,
        excludedInactive,
        excludedBlockedOrDeleted,
        excludedMissingConversation,
        matchCountBefore,
        matchCountAfter: await count(executor, "matches"),
        messageCountBefore,
        messageCountAfter: await count(executor, "messages"),
        apply,
    };
}
