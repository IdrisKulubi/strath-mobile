import { and, desc, eq, inArray, ne, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { matches, messages, mutualMatches, profiles, user } from "@/db/schema";
import { CHAT_UNLOCKED_STATUSES, isChatUnlockedStatus } from "@/lib/chat-access";
import { ensureLegacyMatch } from "@/lib/services/legacy-match-service";

export interface ConversationItem {
    id: string;
    mutualMatchId: string;
    arrangementStatus: string;
    partner: {
        id: string;
        name: string;
        image: string | null;
        lastActive: string | null;
    };
    lastMessage: {
        id: string;
        content: string;
        senderId: string;
        status: "sent" | "delivered" | "read";
        createdAt: string;
    } | null;
    unreadCount: number;
    createdAt: string;
}

const LISTABLE_STATUSES = [...CHAT_UNLOCKED_STATUSES] as const;

export async function listConversationsForUser(userId: string): Promise<ConversationItem[]> {
    const rows = await db.query.mutualMatches.findMany({
        where: and(
            or(eq(mutualMatches.userAId, userId), eq(mutualMatches.userBId, userId)),
            inArray(mutualMatches.status, [...LISTABLE_STATUSES]),
        ),
        orderBy: [desc(mutualMatches.updatedAt), desc(mutualMatches.createdAt)],
    });

    if (rows.length === 0) {
        return [];
    }

    const hydrated = await db.transaction(async (tx) => {
        const results: Array<{
            row: typeof rows[number];
            legacyMatchId: string;
        }> = [];

        for (const row of rows) {
            if (!isChatUnlockedStatus(row.status)) {
                continue;
            }

            let legacyMatchId = row.legacyMatchId;
            if (!legacyMatchId) {
                const legacy = await ensureLegacyMatch(tx, row.userAId, row.userBId);
                legacyMatchId = legacy.id;
                await tx
                    .update(mutualMatches)
                    .set({ legacyMatchId: legacy.id, updatedAt: new Date() })
                    .where(eq(mutualMatches.id, row.id));
            }

            results.push({ row, legacyMatchId });
        }

        return results;
    });

    const uniqueHydrated = dedupeHydratedByPartner(hydrated, userId);

    const legacyIds = uniqueHydrated.map((item) => item.legacyMatchId);

    const [matchRows, unreadRows] = await Promise.all([
        legacyIds.length > 0
            ? db.query.matches.findMany({
                  where: inArray(matches.id, legacyIds),
                  with: {
                      messages: {
                          limit: 1,
                          orderBy: (m, { desc: orderDesc }) => [orderDesc(m.createdAt)],
                      },
                  },
              })
            : Promise.resolve([]),
        legacyIds.length > 0
            ? db
                  .select({
                      matchId: messages.matchId,
                      count: sql<number>`count(*)::int`,
                  })
                  .from(messages)
                  .where(
                      and(
                          inArray(messages.matchId, legacyIds),
                          ne(messages.senderId, userId),
                          ne(messages.status, "read"),
                      ),
                  )
                  .groupBy(messages.matchId)
            : Promise.resolve([]),
    ]);

    const matchById = new Map(matchRows.map((m) => [m.id, m]));
    const unreadByMatch = new Map(unreadRows.map((r) => [r.matchId, Number(r.count) || 0]));

    const items: ConversationItem[] = [];

    for (const { row, legacyMatchId } of uniqueHydrated) {
        const otherUserId = row.userAId === userId ? row.userBId : row.userAId;
        const [profile, partnerUser] = await Promise.all([
            db.query.profiles.findFirst({
                where: eq(profiles.userId, otherUserId),
            }),
            db.query.user.findFirst({
                where: eq(user.id, otherUserId),
            }),
        ]);

        const primaryPhoto =
            (Array.isArray(profile?.photos) ? profile.photos[0] : null)
            ?? profile?.profilePhoto
            ?? partnerUser?.profilePhoto
            ?? partnerUser?.image
            ?? null;

        const legacyMatch = matchById.get(legacyMatchId);
        const lastMsg = legacyMatch?.messages?.[0] ?? null;

        items.push({
            id: legacyMatchId,
            mutualMatchId: row.id,
            arrangementStatus: row.status,
            partner: {
                id: otherUserId,
                name:
                    profile?.firstName
                    ?? partnerUser?.name?.split(" ")[0]
                    ?? "Unknown",
                image: primaryPhoto,
                lastActive: partnerUser?.lastActive?.toISOString() ?? null,
            },
            lastMessage: lastMsg
                ? {
                      id: lastMsg.id,
                      content: lastMsg.content,
                      senderId: lastMsg.senderId,
                      status: lastMsg.status as "sent" | "delivered" | "read",
                      createdAt: lastMsg.createdAt.toISOString(),
                  }
                : null,
            unreadCount: unreadByMatch.get(legacyMatchId) ?? 0,
            createdAt: row.createdAt.toISOString(),
        });
    }

    items.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ?? a.createdAt;
        const bTime = b.lastMessage?.createdAt ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
    });

    return items;
}

/** One inbox row per partner when multiple mutual_matches share the same legacy chat thread. */
function dedupeHydratedByPartner<T extends { row: { userAId: string; userBId: string; updatedAt: Date }; legacyMatchId: string }>(
    hydrated: T[],
    userId: string,
): T[] {
    const byPartner = new Map<string, T>();

    for (const item of hydrated) {
        const partnerId = item.row.userAId === userId ? item.row.userBId : item.row.userAId;
        const existing = byPartner.get(partnerId);
        if (!existing || item.row.updatedAt > existing.row.updatedAt) {
            byPartner.set(partnerId, item);
        }
    }

    return [...byPartner.values()];
}
