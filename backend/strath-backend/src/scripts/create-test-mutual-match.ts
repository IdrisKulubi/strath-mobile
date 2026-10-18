import dotenv from "dotenv";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";

dotenv.config({ path: ".env.local" });

const DEFAULT_EMAIL_A = "mariah.jasminee@icloud.com";
const DEFAULT_EMAIL_B = "kulubiiidris@gmail.com";

const emailA = (process.argv[2] ?? DEFAULT_EMAIL_A).trim().toLowerCase();
const emailB = (process.argv[3] ?? DEFAULT_EMAIL_B).trim().toLowerCase();

async function main() {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined in .env.local");
    }

    const { default: db } = await import("@/db/drizzle");
    const {
        candidatePairHistory,
        candidatePairs,
        dateMatches,
        messages,
        mutualMatches,
        user,
    } = await import("@/db/schema");
    const { canonicalizePairUsers } = await import("@/lib/services/candidate-pairs-service");
    const { ensureLegacyMatch } = await import("@/lib/services/legacy-match-service");
    const { assignMeetupSlot } = await import("@/lib/services/meetup-slot-service");

    async function findUserByEmail(email: string) {
        return db.query.user.findFirst({
            where: eq(user.email, email),
            columns: { id: true, email: true, name: true },
        });
    }

    const [firstUser, secondUser] = await Promise.all([
        findUserByEmail(emailA),
        findUserByEmail(emailB),
    ]);

    if (!firstUser) throw new Error(`User not found: ${emailA}`);
    if (!secondUser) {
        const closeMatches = await db
            .select({ id: user.id, email: user.email, name: user.name })
            .from(user)
            .where(or(ilike(user.email, "%kulubi%"), ilike(user.email, "%idris%")));
        throw new Error(`User not found: ${emailB}. Close matches: ${JSON.stringify(closeMatches)}`);
    }
    if (firstUser.id === secondUser.id) throw new Error("Cannot match a user with themselves");

    const now = new Date();
    const { userAId, userBId } = canonicalizePairUsers(firstUser.id, secondUser.id);

    const result = await db.transaction(async (tx) => {
        const existingPair = await tx.query.candidatePairs.findFirst({
            where: and(
                eq(candidatePairs.userAId, userAId),
                eq(candidatePairs.userBId, userBId),
                or(
                    eq(candidatePairs.status, "mutual"),
                    eq(candidatePairs.status, "active"),
                    eq(candidatePairs.status, "queued"),
                    eq(candidatePairs.status, "closed"),
                    eq(candidatePairs.status, "expired"),
                ),
            ),
            orderBy: (table) => [
                desc(table.status),
                desc(table.updatedAt),
                desc(table.createdAt),
            ],
        });

        let pair = existingPair;
        let pairAction: "created" | "updated" | "reused" = "reused";

        if (!pair || pair.status === "closed" || pair.status === "expired") {
            const [created] = await tx
                .insert(candidatePairs)
                .values({
                    userAId,
                    userBId,
                    compatibilityScore: 99,
                    matchReasons: ["Test mutual match", "Created for flow QA"],
                    shownToAAt: now,
                    shownToBAt: now,
                    aDecision: "open_to_meet",
                    bDecision: "open_to_meet",
                    status: "mutual",
                    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                    createdAt: now,
                    updatedAt: now,
                })
                .returning();
            pair = created;
            pairAction = "created";

            await tx.insert(candidatePairHistory).values([
                {
                    pairId: pair.id,
                    eventType: "generated",
                    toStatus: "active",
                    metadata: { source: "test_script", emails: [emailA, emailB] },
                    createdAt: now,
                },
                {
                    pairId: pair.id,
                    eventType: "mutual",
                    fromStatus: "active",
                    toStatus: "mutual",
                    metadata: { source: "test_script", aDecision: "open_to_meet", bDecision: "open_to_meet" },
                    createdAt: now,
                },
            ]);
        } else if (pair.status !== "mutual" || pair.aDecision !== "open_to_meet" || pair.bDecision !== "open_to_meet") {
            const [updated] = await tx
                .update(candidatePairs)
                .set({
                    aDecision: "open_to_meet",
                    bDecision: "open_to_meet",
                    status: "mutual",
                    expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
                    updatedAt: now,
                })
                .where(eq(candidatePairs.id, pair.id))
                .returning();
            pair = updated;
            pairAction = "updated";

            await tx.insert(candidatePairHistory).values({
                pairId: pair.id,
                eventType: "mutual",
                fromStatus: existingPair?.status,
                toStatus: "mutual",
                metadata: { source: "test_script", aDecision: "open_to_meet", bDecision: "open_to_meet" },
                createdAt: now,
            });
        }

        if (!pair) throw new Error("Unable to create or locate candidate pair");

        const legacyMatch = await ensureLegacyMatch(tx, userAId, userBId);

        let mutual = await tx.query.mutualMatches.findFirst({
            where: eq(mutualMatches.candidatePairId, pair.id),
        });
        let mutualAction: "created" | "updated" | "reused" = "reused";

        const assignment = assignMeetupSlot(now);
        if (!mutual) {
            const [createdMutual] = await tx
                .insert(mutualMatches)
                .values({
                    candidatePairId: pair.id,
                    userAId,
                    userBId,
                    status: "mutual",
                    legacyMatchId: legacyMatch.id,
                    scheduledAt: assignment.scheduledAt,
                    slotConfirmBy: assignment.confirmBy,
                    assignedSlot: assignment.slot,
                    createdAt: now,
                    updatedAt: now,
                })
                .returning();
            mutual = createdMutual;
            mutualAction = "created";
        } else if (mutual.status !== "mutual" || !mutual.legacyMatchId) {
            const [updatedMutual] = await tx
                .update(mutualMatches)
                .set({
                    status: "mutual",
                    legacyMatchId: mutual.legacyMatchId ?? legacyMatch.id,
                    scheduledAt: mutual.scheduledAt ?? assignment.scheduledAt,
                    slotConfirmBy: mutual.slotConfirmBy ?? assignment.confirmBy,
                    assignedSlot: mutual.assignedSlot ?? assignment.slot,
                    updatedAt: now,
                })
                .where(eq(mutualMatches.id, mutual.id))
                .returning();
            mutual = updatedMutual;
            mutualAction = "updated";
        }

        let dateMatch = mutual.legacyDateMatchId
            ? await tx.query.dateMatches.findFirst({ where: eq(dateMatches.id, mutual.legacyDateMatchId) })
            : null;

        if (!dateMatch) {
            dateMatch = await tx.query.dateMatches.findFirst({
                where: eq(dateMatches.candidatePairId, pair.id),
                orderBy: (table) => [asc(table.createdAt)],
            });
        }

        let dateMatchAction: "created" | "linked" | "reused" = "reused";
        if (!dateMatch) {
            const [createdDateMatch] = await tx
                .insert(dateMatches)
                .values({
                    candidatePairId: pair.id,
                    userAId,
                    userBId,
                    vibe: "coffee",
                    status: "pending_setup",
                    scheduledAt: mutual.scheduledAt ?? assignment.scheduledAt,
                    callCompleted: false,
                    userAConfirmed: false,
                    userBConfirmed: false,
                    createdAt: now,
                })
                .returning();
            dateMatch = createdDateMatch;
            dateMatchAction = "created";
        }

        if (!mutual.legacyDateMatchId) {
            const [linkedMutual] = await tx
                .update(mutualMatches)
                .set({ legacyDateMatchId: dateMatch.id, updatedAt: now })
                .where(eq(mutualMatches.id, mutual.id))
                .returning();
            mutual = linkedMutual;
            if (dateMatchAction === "reused") dateMatchAction = "linked";
        }

        const existingMessages = await tx.query.messages.findMany({
            where: eq(messages.matchId, legacyMatch.id),
            orderBy: (table) => [asc(table.createdAt)],
            limit: 1,
        });

        if (existingMessages.length === 0) {
            await tx.insert(messages).values({
                matchId: legacyMatch.id,
                senderId: userAId,
                content: "Test match created. Ready to try the new flow.",
                status: "delivered",
                createdAt: now,
                updatedAt: now,
            });
        }

        return {
            pairId: pair.id,
            pairAction,
            legacyMatchId: legacyMatch.id,
            mutualMatchId: mutual.id,
            mutualAction,
            dateMatchId: dateMatch.id,
            dateMatchAction,
            userAId,
            userBId,
        };
    });

    console.log(JSON.stringify({
        ok: true,
        emails: [emailA, emailB],
        ...result,
    }, null, 2));
}

main()
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })
    .finally(async () => {
        const maybePool = (await import("@/db/drizzle")).pool;
        await maybePool.end();
    });
