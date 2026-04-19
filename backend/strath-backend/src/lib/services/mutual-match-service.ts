import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    dateMatches,
    mutualMatches,
    profiles,
} from "@/db/schema";
import { computeCompatibility } from "@/lib/services/compatibility-service";

/**
 * After a vibe call both parties say "meet", flip the `mutualMatches` row to `being_arranged` and
 * find-or-create the `dateMatches` row admins use on the Arranging queue.
 *
 * Bridge step is needed because `dateMatches` historically only got created by the legacy
 * `dateRequests` accept flow. The new candidate-pair → mutual → call flow never created one,
 * leaving the admin "Arranging" page empty.
 *
 * Idempotent: safe to call multiple times.
 */
export async function bridgeMutualToBeingArranged(input: {
    user1Id: string;
    user2Id: string;
    candidatePairId?: string | null;
}): Promise<{
    mutualMatchId: string;
    dateMatchId: string;
    created: boolean;
} | null> {
    const { user1Id, user2Id } = input;

    const mutualRow = await db.query.mutualMatches.findFirst({
        where: or(
            and(eq(mutualMatches.userAId, user1Id), eq(mutualMatches.userBId, user2Id)),
            and(eq(mutualMatches.userAId, user2Id), eq(mutualMatches.userBId, user1Id)),
        ),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    if (!mutualRow) {
        console.warn("[mutual-match] bridgeMutualToBeingArranged: no mutualMatches row", {
            user1Id,
            user2Id,
        });
        return null;
    }

    const userAId = mutualRow.userAId;
    const userBId = mutualRow.userBId;

    const existingDateMatch = await db.query.dateMatches.findFirst({
        where: or(
            and(eq(dateMatches.userAId, userAId), eq(dateMatches.userBId, userBId)),
            and(eq(dateMatches.userAId, userBId), eq(dateMatches.userBId, userAId)),
        ),
        orderBy: (m, { desc }) => [desc(m.createdAt)],
    });

    let dateMatchId: string;
    let created = false;
    const now = new Date();

    if (existingDateMatch) {
        dateMatchId = existingDateMatch.id;
        const stillNeedsSetup =
            existingDateMatch.status === "pending_setup" || existingDateMatch.status === "cancelled";

        const update: Partial<typeof dateMatches.$inferInsert> = {
            callCompleted: true,
            userAConfirmed: true,
            userBConfirmed: true,
        };
        if (stillNeedsSetup && existingDateMatch.status !== "pending_setup") {
            update.status = "pending_setup";
        }

        await db.update(dateMatches).set(update).where(eq(dateMatches.id, existingDateMatch.id));
    } else {
        const [inserted] = await db
            .insert(dateMatches)
            .values({
                userAId,
                userBId,
                vibe: "coffee",
                callCompleted: true,
                userAConfirmed: true,
                userBConfirmed: true,
                status: "pending_setup",
                candidatePairId: mutualRow.candidatePairId ?? input.candidatePairId ?? null,
                createdAt: now,
            })
            .returning({ id: dateMatches.id });
        dateMatchId = inserted.id;
        created = true;
    }

    if (
        mutualRow.status !== "being_arranged"
        || mutualRow.legacyDateMatchId !== dateMatchId
    ) {
        await db
            .update(mutualMatches)
            .set({
                status: "being_arranged",
                legacyDateMatchId: dateMatchId,
                updatedAt: now,
            })
            .where(eq(mutualMatches.id, mutualRow.id));
    }

    console.log("[mutual-match] bridged to being_arranged", {
        mutualMatchId: mutualRow.id,
        dateMatchId,
        createdDateMatch: created,
        userAId,
        userBId,
    });

    return {
        mutualMatchId: mutualRow.id,
        dateMatchId,
        created,
    };
}

export type MutualDatesItem = {
    id: string;
    pairId?: string;
    source: "candidate_pair" | "legacy_date_match";
    withUser: {
        id: string;
        firstName: string;
        age?: number;
        profilePhoto?: string;
        compatibilityScore?: number;
        compatibilityReasons?: string[];
    };
    arrangementStatus: "mutual" | "call_pending" | "being_arranged" | "upcoming" | "completed" | "cancelled" | "expired";
    legacyMatchId?: string;
    legacyDateMatchId?: string;
    venueName?: string;
    venueAddress?: string;
    scheduledAt?: string;
    createdAt: string;
};

export function mapLegacyDateStatus(
    dm: typeof dateMatches.$inferSelect,
): MutualDatesItem["arrangementStatus"] {
    if (dm.status === "attended") return "completed";
    if (dm.status === "cancelled" || dm.status === "no_show") return "cancelled";
    if (dm.status === "scheduled") return "upcoming";
    // Match admin "Arranging" queue: only after vibe call and both users confirmed meet intent
    if (dm.callCompleted && dm.userAConfirmed && dm.userBConfirmed) return "being_arranged";
    return "call_pending";
}

export async function listMutualDatesForUser(userId: string): Promise<MutualDatesItem[]> {
    const [mutualRows, legacyRows] = await Promise.all([
        db
            .select()
            .from(mutualMatches)
            .where(
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
            )
            .orderBy(desc(mutualMatches.createdAt)),
        db
            .select()
            .from(dateMatches)
            .where(
                and(
                    or(
                        eq(dateMatches.userAId, userId),
                        eq(dateMatches.userBId, userId),
                    ),
                ),
            )
            .orderBy(desc(dateMatches.createdAt)),
    ]);

    const hydratedMutuals = await Promise.all(
        mutualRows.map(async (row) => {
            const otherUserId = row.userAId === userId ? row.userBId : row.userAId;
            const [profile, compatibility] = await Promise.all([
                db.query.profiles.findFirst({
                    where: eq(profiles.userId, otherUserId),
                    with: { user: true },
                }),
                computeCompatibility(userId, otherUserId),
            ]);
            const primaryPhoto =
                (Array.isArray(profile?.photos) ? profile.photos[0] : null)
                ?? profile?.profilePhoto
                ?? profile?.user?.profilePhoto
                ?? profile?.user?.image
                ?? undefined;

            return {
                id: row.id,
                pairId: row.candidatePairId,
                source: "candidate_pair" as const,
                withUser: {
                    id: otherUserId,
                    firstName: profile?.firstName ?? profile?.user?.name?.split(" ")[0] ?? "Unknown",
                    age: profile?.age ?? 0,
                    profilePhoto: primaryPhoto,
                    compatibilityScore: compatibility.score,
                    compatibilityReasons: compatibility.reasons,
                },
                arrangementStatus: row.status,
                legacyMatchId: row.legacyMatchId ?? undefined,
                legacyDateMatchId: row.legacyDateMatchId ?? undefined,
                venueName: row.venueName ?? undefined,
                venueAddress: row.venueAddress ?? undefined,
                scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
                createdAt: row.createdAt.toISOString(),
            };
        }),
    );

    const bridgedLegacyIds = new Set(
        mutualRows
            .map((row) => row.legacyDateMatchId)
            .filter((id): id is string => Boolean(id)),
    );

    const hydratedLegacy = await Promise.all(
        legacyRows
            .filter((row) => !bridgedLegacyIds.has(row.id))
            .map(async (row) => {
                const otherUserId = row.userAId === userId ? row.userBId : row.userAId;
                const [profile, compatibility] = await Promise.all([
                    db.query.profiles.findFirst({
                        where: eq(profiles.userId, otherUserId),
                        with: { user: true },
                    }),
                    computeCompatibility(userId, otherUserId),
                ]);
                const primaryPhoto =
                    (Array.isArray(profile?.photos) ? profile.photos[0] : null)
                    ?? profile?.profilePhoto
                    ?? profile?.user?.profilePhoto
                    ?? profile?.user?.image
                    ?? undefined;

                return {
                    id: row.id,
                    source: "legacy_date_match" as const,
                    withUser: {
                        id: otherUserId,
                        firstName: profile?.firstName ?? profile?.user?.name?.split(" ")[0] ?? "Unknown",
                        age: profile?.age ?? 0,
                        profilePhoto: primaryPhoto,
                        compatibilityScore: compatibility.score,
                        compatibilityReasons: compatibility.reasons,
                    },
                    arrangementStatus: mapLegacyDateStatus(row),
                    legacyDateMatchId: row.id,
                    venueName: row.venueName ?? undefined,
                    venueAddress: row.venueAddress ?? undefined,
                    scheduledAt: row.scheduledAt?.toISOString() ?? undefined,
                    createdAt: row.createdAt.toISOString(),
                };
            }),
    );

    return [...hydratedMutuals, ...hydratedLegacy].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );
}
