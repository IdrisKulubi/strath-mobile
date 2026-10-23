import { and, asc, eq, or } from "drizzle-orm";

import db from "@/db/drizzle";
import { matches } from "@/db/schema";

type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function canonicalizeMatchUsers(userAId: string, userBId: string) {
    return userAId < userBId
        ? { user1Id: userAId, user2Id: userBId }
        : { user1Id: userBId, user2Id: userAId };
}

async function findExistingLegacyMatch(tx: TransactionClient, userAId: string, userBId: string) {
    return tx.query.matches.findFirst({
        where: or(
            and(eq(matches.user1Id, userAId), eq(matches.user2Id, userBId)),
            and(eq(matches.user1Id, userBId), eq(matches.user2Id, userAId)),
        ),
        orderBy: (table) => [asc(table.createdAt), asc(table.id)],
    });
}

/** Find-or-create the legacy `matches` row used for chat threads. */
export async function ensureLegacyMatch(tx: TransactionClient, userAId: string, userBId: string) {
    const existing = await findExistingLegacyMatch(tx, userAId, userBId);

    if (existing) {
        return existing;
    }

    const now = new Date();
    const { user1Id, user2Id } = canonicalizeMatchUsers(userAId, userBId);
    const [created] = await tx
        .insert(matches)
        .values({
            user1Id,
            user2Id,
            createdAt: now,
            updatedAt: now,
        })
        .onConflictDoNothing()
        .returning();

    if (created) {
        return created;
    }

    const concurrent = await findExistingLegacyMatch(tx, userAId, userBId);
    if (!concurrent) {
        throw new Error("Unable to create or locate the chat match");
    }

    return concurrent;
}
