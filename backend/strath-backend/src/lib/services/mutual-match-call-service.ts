import { and, eq, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { matches, mutualMatches, user as userTable } from "@/db/schema";
import { createOrGetVibeCheckWithMeta } from "@/lib/services/vibe-check-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

type PartnerAvailability = "online" | "recently_active" | "offline";
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

function getPartnerAvailability(
    isOnline: boolean | null | undefined,
    lastActive: Date | null | undefined,
): PartnerAvailability {
    if (!isOnline || !lastActive) {
        return "offline";
    }

    const diffMs = Date.now() - lastActive.getTime();
    const diffMinutes = diffMs / (1000 * 60);

    if (diffMinutes <= 1) {
        return "online";
    }

    if (diffMinutes <= 5) {
        return "recently_active";
    }

    return "offline";
}

export function canonicalizeMatchUsers(userAId: string, userBId: string) {
    return userAId < userBId
        ? { user1Id: userAId, user2Id: userBId }
        : { user1Id: userBId, user2Id: userAId };
}

export function shouldSendCallReadyNotification(
    partnerPushToken: string | null | undefined,
    wasCreated: boolean,
) {
    return Boolean(partnerPushToken && wasCreated);
}

async function findExistingLegacyMatch(tx: TransactionClient, userAId: string, userBId: string) {
    return tx.query.matches.findFirst({
        where: or(
            and(eq(matches.user1Id, userAId), eq(matches.user2Id, userBId)),
            and(eq(matches.user1Id, userBId), eq(matches.user2Id, userAId)),
        ),
        orderBy: (table, { asc: orderAsc }) => [orderAsc(table.createdAt), orderAsc(table.id)],
    });
}

async function ensureLegacyMatch(tx: TransactionClient, userAId: string, userBId: string) {
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
        throw new Error("Unable to create or locate the call match");
    }

    return concurrent;
}

export async function startCallForMutualMatch(mutualMatchId: string, userId: string) {
    const result = await db.transaction(async (tx) => {
        await tx.execute(sql`
            SELECT ${mutualMatches.id}
            FROM ${mutualMatches}
            WHERE ${mutualMatches.id} = ${mutualMatchId}
            FOR UPDATE
        `);

        const mutualMatch = await tx.query.mutualMatches.findFirst({
            where: eq(mutualMatches.id, mutualMatchId),
        });

        if (!mutualMatch) {
            throw new Error("Mutual match not found");
        }

        const isParticipant = mutualMatch.userAId === userId || mutualMatch.userBId === userId;
        if (!isParticipant) {
            throw new Error("You are not allowed to start this call");
        }

        if (!["mutual", "call_pending"].includes(mutualMatch.status)) {
            throw new Error("This match is not ready for a call");
        }

        const partnerUserId = mutualMatch.userAId === userId ? mutualMatch.userBId : mutualMatch.userAId;
        const [starter, partner] = await Promise.all([
            tx.query.user.findFirst({ where: eq(userTable.id, userId) }),
            tx.query.user.findFirst({ where: eq(userTable.id, partnerUserId) }),
        ]);

        const partnerAvailability = getPartnerAvailability(partner?.isOnline, partner?.lastActive);

        const linkedLegacyMatch = mutualMatch.legacyMatchId
            ? await tx.query.matches.findFirst({ where: eq(matches.id, mutualMatch.legacyMatchId) })
            : null;

        const legacyMatch = linkedLegacyMatch
            ?? await ensureLegacyMatch(tx, mutualMatch.userAId, mutualMatch.userBId);

        if (!legacyMatch) {
            throw new Error("Unable to create a call match");
        }

        if (mutualMatch.legacyMatchId !== legacyMatch.id || mutualMatch.status !== "call_pending") {
            await tx
                .update(mutualMatches)
                .set({
                    legacyMatchId: legacyMatch.id,
                    status: "call_pending",
                    updatedAt: new Date(),
                })
                .where(eq(mutualMatches.id, mutualMatchId));
        }

        const { session: vibeCheck, wasCreated } = await createOrGetVibeCheckWithMeta(
            legacyMatch.id,
            userId,
            tx,
        );

        return {
            mutualMatchId: mutualMatch.id,
            matchId: legacyMatch.id,
            vibeCheckId: vibeCheck.id,
            partnerAvailability,
            reusedExistingCall: !wasCreated,
            shouldSendNotification: shouldSendCallReadyNotification(partner?.pushToken, wasCreated),
            partnerPushToken: partner?.pushToken ?? null,
            starterFirstName: starter?.name?.split(" ")[0] ?? "Someone",
            candidatePairId: mutualMatch.candidatePairId,
        };
    });

    let notificationSent = false;

    if (result.shouldSendNotification && result.partnerPushToken) {
        try {
            await sendPushNotification(result.partnerPushToken, {
                title: "Your 3-minute call is ready",
                body: `${result.starterFirstName} started the vibe check.`,
                data: {
                    type: NOTIFICATION_TYPES.CALL_REMINDER,
                    matchId: result.matchId,
                    pairId: result.candidatePairId,
                    mutualMatchId: result.mutualMatchId,
                    route: `/vibe-check/${result.matchId}?mode=recipient`,
                },
            });
            notificationSent = true;
        } catch (error) {
            console.warn("[mutual-match-call] Failed to send partner notification:", error);
        }
    }

    return {
        mutualMatchId: result.mutualMatchId,
        matchId: result.matchId,
        vibeCheckId: result.vibeCheckId,
        partnerAvailability: result.partnerAvailability,
        notificationSent,
        reusedExistingCall: result.reusedExistingCall,
    };
}
