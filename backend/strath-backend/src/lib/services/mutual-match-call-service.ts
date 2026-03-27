import { and, eq, or } from "drizzle-orm";

import { db } from "@/lib/db";
import { matches, mutualMatches, user as userTable } from "@/db/schema";
import { createOrGetVibeCheck } from "@/lib/services/vibe-check-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

type PartnerAvailability = "online" | "recently_active" | "offline";

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

async function ensureLegacyMatch(userAId: string, userBId: string) {
    const existing = await db.query.matches.findFirst({
        where: or(
            and(eq(matches.user1Id, userAId), eq(matches.user2Id, userBId)),
            and(eq(matches.user1Id, userBId), eq(matches.user2Id, userAId)),
        ),
    });

    if (existing) {
        return existing;
    }

    const now = new Date();
    const [created] = await db.insert(matches).values({
        user1Id: userAId,
        user2Id: userBId,
        createdAt: now,
        updatedAt: now,
    }).returning();

    return created;
}

export async function startCallForMutualMatch(mutualMatchId: string, userId: string) {
    const mutualMatch = await db.query.mutualMatches.findFirst({
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
        db.query.user.findFirst({ where: eq(userTable.id, userId) }),
        db.query.user.findFirst({ where: eq(userTable.id, partnerUserId) }),
    ]);

    const partnerAvailability = getPartnerAvailability(partner?.isOnline, partner?.lastActive);
    if (partnerAvailability !== "online") {
        throw new Error("They are not online right now. Try again when they are active.");
    }

    const legacyMatch = mutualMatch.legacyMatchId
        ? await db.query.matches.findFirst({ where: eq(matches.id, mutualMatch.legacyMatchId) })
        : await ensureLegacyMatch(mutualMatch.userAId, mutualMatch.userBId);

    if (!legacyMatch) {
        throw new Error("Unable to create a call match");
    }

    if (mutualMatch.legacyMatchId !== legacyMatch.id || mutualMatch.status !== "call_pending") {
        await db.update(mutualMatches)
            .set({
                legacyMatchId: legacyMatch.id,
                status: "call_pending",
                updatedAt: new Date(),
            })
            .where(eq(mutualMatches.id, mutualMatchId));
    }

    const vibeCheck = await createOrGetVibeCheck(legacyMatch.id, userId);

    let notificationSent = false;

    if (partner?.pushToken) {
        await sendPushNotification(partner.pushToken, {
            title: "Your 3-minute call is ready",
            body: `${starter?.name?.split(" ")[0] ?? "Someone"} started the vibe check.`,
            data: {
                type: NOTIFICATION_TYPES.CALL_REMINDER,
                matchId: legacyMatch.id,
                pairId: mutualMatch.candidatePairId,
                mutualMatchId: mutualMatch.id,
                route: `/vibe-check/${legacyMatch.id}?mode=recipient`,
            },
        });
        notificationSent = true;
    }

    return {
        mutualMatchId: mutualMatch.id,
        matchId: legacyMatch.id,
        vibeCheckId: vibeCheck.id,
        partnerAvailability,
        notificationSent,
    };
}
