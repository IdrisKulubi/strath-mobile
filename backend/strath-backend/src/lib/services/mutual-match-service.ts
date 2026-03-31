import { and, desc, eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    dateMatches,
    mutualMatches,
    profiles,
} from "@/db/schema";
import { computeCompatibility } from "@/lib/services/compatibility-service";

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
    if (dm.callCompleted) return "being_arranged";
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
