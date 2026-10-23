import dotenv from "dotenv";
import { and, eq, inArray, ne, sql } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

async function main() {
    const { default: db, pool } = await import("../src/db/drizzle");
    const { candidatePairHistory, candidatePairs } = await import("../src/db/schema");

    const now = new Date();
    const forever = new Date("2099-12-31T23:59:59.000Z");

    const curatedRows = await db
        .select({ pairId: candidatePairHistory.pairId })
        .from(candidatePairHistory)
        .where(
            and(
                eq(candidatePairHistory.eventType, "generated"),
                sql`${candidatePairHistory.metadata}->>'source' = 'admin_curated'`,
            ),
        );

    const curatedPairIds = [...new Set(curatedRows.map((row) => row.pairId))];
    if (curatedPairIds.length === 0) {
        console.log("No admin-curated pairs found.");
        await pool.end();
        return;
    }

    const candidates = await db
        .select()
        .from(candidatePairs)
        .where(
            and(
                inArray(candidatePairs.id, curatedPairIds),
                inArray(candidatePairs.status, ["active", "expired"]),
                ne(candidatePairs.aDecision, "passed"),
                ne(candidatePairs.bDecision, "passed"),
            ),
        );

    let restored = 0;
    let extended = 0;
    let skipped = 0;

    await db.transaction(async (tx) => {
        for (const pair of candidates) {
            if (pair.status === "expired") {
                const liveDuplicate = await tx.query.candidatePairs.findFirst({
                    where: and(
                        eq(candidatePairs.userAId, pair.userAId),
                        eq(candidatePairs.userBId, pair.userBId),
                        inArray(candidatePairs.status, ["active", "queued", "mutual"]),
                        ne(candidatePairs.id, pair.id),
                    ),
                });

                if (liveDuplicate) {
                    skipped += 1;
                    continue;
                }

                await tx
                    .update(candidatePairs)
                    .set({ status: "active", expiresAt: forever, updatedAt: now })
                    .where(eq(candidatePairs.id, pair.id));

                await tx.insert(candidatePairHistory).values({
                    pairId: pair.id,
                    eventType: "responded",
                    fromStatus: "expired",
                    toStatus: "active",
                    metadata: {
                        source: "admin_data_restore",
                        reason: "manual_curated_pairs_do_not_time_expire",
                    },
                });

                restored += 1;
                continue;
            }

            if (pair.expiresAt < forever) {
                await tx
                    .update(candidatePairs)
                    .set({ expiresAt: forever, updatedAt: now })
                    .where(eq(candidatePairs.id, pair.id));

                extended += 1;
            }
        }
    });

    console.log(JSON.stringify({ restored, extended, skipped }, null, 2));
    await pool.end();
}

main().catch(async (error) => {
    console.error(error);
    try {
        const { pool } = await import("../src/db/drizzle");
        await pool.end();
    } catch {
        // Ignore cleanup errors while reporting the original failure.
    }
    process.exit(1);
});
