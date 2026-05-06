import dotenv from "dotenv";
import { and, eq, inArray, ne, or } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const leoPhone = "+254727699545";
const praiseEmail = "praise.mensah@strathmore.edu";

function displayName(row: { firstName: string | null; lastName: string | null; fallbackName: string | null }) {
    return [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || row.fallbackName || "Unknown";
}

async function main() {
    const { default: db, pool } = await import("../src/db/drizzle");
    const { candidatePairHistory, candidatePairs, profiles, user } = await import("../src/db/schema");

    console.log("Looking up Leo and Praise...");
    const people = await db
        .select({
            userId: user.id,
            email: user.email,
            fallbackName: user.name,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            profilePhone: profiles.phoneNumber,
            userPhone: user.phoneNumber,
        })
        .from(user)
        .innerJoin(profiles, eq(profiles.userId, user.id))
        .where(
            or(
                eq(profiles.phoneNumber, leoPhone),
                eq(user.phoneNumber, leoPhone),
                eq(user.email, praiseEmail),
            ),
        );

    const leo = people.find((row) => row.profilePhone === leoPhone || row.userPhone === leoPhone);
    const praise = people.find((row) => row.email === praiseEmail);

    if (!leo || !praise) {
        throw new Error(`Could not find both people. Leo found: ${Boolean(leo)}, Praise found: ${Boolean(praise)}`);
    }

    console.log("Looking up their candidate pair...");
    const pairs = await db
        .select()
        .from(candidatePairs)
        .where(
            or(
                and(eq(candidatePairs.userAId, leo.userId), eq(candidatePairs.userBId, praise.userId)),
                and(eq(candidatePairs.userAId, praise.userId), eq(candidatePairs.userBId, leo.userId)),
            ),
        );

    if (pairs.length === 0) {
        throw new Error(`No candidate pair found for ${displayName(leo)} and ${displayName(praise)}`);
    }

    const pair = [...pairs].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime())[0];
    const now = new Date();
    const expiresAt = new Date("2099-12-31T23:59:59.000Z");
    const praiseIsA = pair.userAId === praise.userId;

    const nextADecision = praiseIsA ? "open_to_meet" : "pending";
    const nextBDecision = praiseIsA ? "pending" : "open_to_meet";

    console.log(`Restoring pair ${pair.id}...`);
    await db.transaction(async (tx) => {
        await tx
            .delete(candidatePairs)
            .where(
                and(
                    eq(candidatePairs.userAId, pair.userAId),
                    eq(candidatePairs.userBId, pair.userBId),
                    inArray(candidatePairs.status, ["active", "queued", "mutual"]),
                    ne(candidatePairs.id, pair.id),
                ),
            );

        await tx
            .update(candidatePairs)
            .set({
                status: "active",
                aDecision: nextADecision,
                bDecision: nextBDecision,
                shownToAAt: pair.shownToAAt ?? now,
                shownToBAt: pair.shownToBAt ?? now,
                expiresAt,
                updatedAt: now,
            })
            .where(eq(candidatePairs.id, pair.id));

        await tx.insert(candidatePairHistory).values({
            pairId: pair.id,
            actorUserId: null,
            eventType: "responded",
            fromStatus: pair.status,
            toStatus: "active",
            metadata: {
                source: "admin_data_restore",
                reason: "restore_leo_praise_after_sent_list_drop",
                leoUserId: leo.userId,
                praiseUserId: praise.userId,
                praiseDecision: "open_to_meet",
                leoDecision: "pending",
            },
        });
    });

    console.log(JSON.stringify({
        restoredPairId: pair.id,
        leo: { userId: leo.userId, name: displayName(leo), decision: praiseIsA ? nextBDecision : nextADecision },
        praise: { userId: praise.userId, name: displayName(praise), decision: praiseIsA ? nextADecision : nextBDecision },
        status: "active",
        expiresAt: expiresAt.toISOString(),
    }, null, 2));

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
