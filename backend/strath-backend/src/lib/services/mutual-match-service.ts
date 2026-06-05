import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
    dateMatches,
    messages,
    mutualMatches,
    profiles,
} from "@/db/schema";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { buildSlotConfirmationViewWithReschedule } from "@/lib/services/meetup-reschedule-service";

/**
 * Admin moves a mutual match to arranging: flip `mutualMatches` to `being_arranged` and
 * find-or-create the `dateMatches` row admins use on the Arranging queue.
 *
 * Idempotent: safe to call multiple times.
 */
export async function bridgeMutualToBeingArranged(input: {
    user1Id: string;
    user2Id: string;
    candidatePairId?: string | null;
    mutualMatchId?: string | null;
}): Promise<{
    mutualMatchId: string;
    dateMatchId: string;
    created: boolean;
} | null> {
    const { user1Id, user2Id } = input;

    const mutualRow = input.mutualMatchId
        ? await db.query.mutualMatches.findFirst({
              where: eq(mutualMatches.id, input.mutualMatchId),
          })
        : await db.query.mutualMatches.findFirst({
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
            mutualMatchId: input.mutualMatchId ?? null,
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

        if (stillNeedsSetup && existingDateMatch.status !== "pending_setup") {
            await db
                .update(dateMatches)
                .set({ status: "pending_setup" })
                .where(eq(dateMatches.id, existingDateMatch.id));
        }
    } else {
        const [inserted] = await db
            .insert(dateMatches)
            .values({
                userAId,
                userBId,
                vibe: "coffee",
                callCompleted: false,
                userAConfirmed: false,
                userBConfirmed: false,
                status: "pending_setup",
                scheduledAt: mutualRow.scheduledAt ?? null,
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
    arrangementStatus: "mutual" | "being_arranged" | "upcoming" | "completed" | "cancelled" | "expired";
    legacyMatchId?: string;
    legacyDateMatchId?: string;
    venueName?: string;
    venueAddress?: string;
    scheduledAt?: string;
    confirmBy?: string;
    assignedSlot?: "wednesday" | "saturday";
    viewerSlotConfirmed?: boolean;
    partnerSlotConfirmed?: boolean;
    needsSlotConfirmation?: boolean;
    confirmWindowOpen?: boolean;
    createdAt: string;
    /**
     * Unread messages the viewer has not read yet in the linked chat thread. Populated
     * only for items where chat is listed (status in `CHAT_UNLOCKED_STATUSES`
     * and a `legacyMatchId` exists). Omitted otherwise.
     */
    unreadMessageCount?: number;
};

const CHAT_UNLOCKED_STATUSES: ReadonlyArray<MutualDatesItem["arrangementStatus"]> = [
    "mutual",
    "being_arranged",
    "upcoming",
    "completed",
];

export function mapLegacyDateStatus(
    dm: typeof dateMatches.$inferSelect,
): MutualDatesItem["arrangementStatus"] {
    if (dm.status === "attended") return "completed";
    if (dm.status === "cancelled" || dm.status === "no_show") return "cancelled";
    if (dm.status === "scheduled") return "upcoming";
    if (dm.status === "pending_setup") return "being_arranged";
    return "mutual";
}

/**
 * Pure mapping from admin-facing `dateMatches.status` (+ call/confirmation flags) to the
 * corresponding `mutualMatches.status` value used by the mobile app.
 */
export function mapDateMatchStatusToMutualStatus(dm: {
    status: typeof dateMatches.$inferSelect["status"];
    callCompleted: boolean | null;
    userAConfirmed: boolean | null;
    userBConfirmed: boolean | null;
}): "being_arranged" | "upcoming" | "completed" | "cancelled" | null {
    if (dm.status === "scheduled") return "upcoming";
    if (dm.status === "attended") return "completed";
    if (dm.status === "cancelled" || dm.status === "no_show") return "cancelled";
    if (dm.status === "pending_setup") {
        return "being_arranged";
    }
    return null;
}

export interface SyncMutualFromDateMatchResult {
    synced: boolean;
    mutualMatchId?: string;
    previousStatus?: typeof mutualMatches.$inferSelect["status"];
    nextStatus?: typeof mutualMatches.$inferSelect["status"];
    reason?: "no_date_match" | "no_linked_mutual" | "no_change";
}

/**
 * Keep the bridged `mutualMatches` row in sync with its linked `dateMatches`. Admin actions
 * (schedule date, mark attended / cancelled / no_show) only touch `dateMatches`, so the mobile
 * app — which reads `mutualMatches.status`, `venueName`, `venueAddress`, and `scheduledAt` for
 * the Arranging / Upcoming tabs and the home hold card — would otherwise stay behind.
 */
export async function syncMutualMatchFromDateMatch(
    dateMatchId: string,
): Promise<SyncMutualFromDateMatchResult> {
    const dm = await db.query.dateMatches.findFirst({
        where: eq(dateMatches.id, dateMatchId),
    });
    if (!dm) return { synced: false, reason: "no_date_match" };

    const mutualRow = await db.query.mutualMatches.findFirst({
        where: eq(mutualMatches.legacyDateMatchId, dateMatchId),
    });
    if (!mutualRow) return { synced: false, reason: "no_linked_mutual" };

    const mapped = mapDateMatchStatusToMutualStatus(dm);
    const nextStatus = (mapped ?? mutualRow.status) as typeof mutualMatches.$inferSelect["status"];

    const currentScheduledMs = mutualRow.scheduledAt?.getTime() ?? null;
    const nextScheduledMs = dm.scheduledAt?.getTime() ?? null;

    const statusChanged = nextStatus !== mutualRow.status;
    const venueChanged = (mutualRow.venueName ?? null) !== (dm.venueName ?? null);
    const addressChanged = (mutualRow.venueAddress ?? null) !== (dm.venueAddress ?? null);
    const timeChanged = currentScheduledMs !== nextScheduledMs;

    if (!statusChanged && !venueChanged && !addressChanged && !timeChanged) {
        return {
            synced: false,
            mutualMatchId: mutualRow.id,
            previousStatus: mutualRow.status,
            nextStatus,
            reason: "no_change",
        };
    }

    const update: Partial<typeof mutualMatches.$inferInsert> = {
        venueName: dm.venueName ?? null,
        venueAddress: dm.venueAddress ?? null,
        scheduledAt: dm.scheduledAt ?? null,
        updatedAt: new Date(),
    };
    if (statusChanged) update.status = nextStatus;

    await db.update(mutualMatches).set(update).where(eq(mutualMatches.id, mutualRow.id));

    console.log("[mutual-match] sync from date_match", {
        mutualMatchId: mutualRow.id,
        dateMatchId,
        previousStatus: mutualRow.status,
        nextStatus,
        statusChanged,
        venueChanged,
        addressChanged,
        timeChanged,
    });

    return {
        synced: true,
        mutualMatchId: mutualRow.id,
        previousStatus: mutualRow.status,
        nextStatus,
    };
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
                ...(await (async () => {
                    const slot = await buildSlotConfirmationViewWithReschedule(row, userId);
                    return {
                        confirmBy: slot.confirmBy ?? undefined,
                        assignedSlot: slot.assignedSlot ?? undefined,
                        viewerSlotConfirmed: slot.viewerSlotConfirmed,
                        partnerSlotConfirmed: slot.partnerSlotConfirmed,
                        needsSlotConfirmation: slot.needsSlotConfirmation,
                        confirmWindowOpen: slot.confirmWindowOpen,
                        reschedule: slot.reschedule,
                    };
                })()),
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

    const combined: MutualDatesItem[] = [...hydratedMutuals, ...hydratedLegacy].sort(
        (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
    );

    const chatUnlockedLegacyIds = combined
        .filter((item) =>
            CHAT_UNLOCKED_STATUSES.includes(item.arrangementStatus)
            && !!item.legacyMatchId,
        )
        .map((item) => item.legacyMatchId as string);

    if (chatUnlockedLegacyIds.length > 0) {
        const rows = await db
            .select({
                matchId: messages.matchId,
                count: sql<number>`count(*)::int`,
            })
            .from(messages)
            .where(
                and(
                    inArray(messages.matchId, chatUnlockedLegacyIds),
                    ne(messages.senderId, userId),
                    ne(messages.status, "read"),
                ),
            )
            .groupBy(messages.matchId);

        const unreadByMatch = new Map<string, number>(
            rows.map((r) => [r.matchId, Number(r.count) || 0]),
        );

        for (const item of combined) {
            if (
                item.legacyMatchId
                && CHAT_UNLOCKED_STATUSES.includes(item.arrangementStatus)
            ) {
                item.unreadMessageCount = unreadByMatch.get(item.legacyMatchId) ?? 0;
            }
        }
    }

    return combined;
}
