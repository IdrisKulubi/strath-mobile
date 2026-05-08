import { and, eq, inArray, or } from "drizzle-orm";

import { candidatePairs, dateMatches, mutualMatches } from "@/db/schema";
import { db } from "@/lib/db";

function canonicalizeUserPair(firstUserId: string, secondUserId: string) {
    return firstUserId < secondUserId
        ? { userAId: firstUserId, userBId: secondUserId }
        : { userAId: secondUserId, userBId: firstUserId };
}

export async function canViewUserProfile(input: {
    viewerUserId: string;
    targetUserId: string;
    targetIsVisible: boolean | null | undefined;
}) {
    const { viewerUserId, targetUserId, targetIsVisible } = input;

    if (viewerUserId === targetUserId) return true;
    if (targetIsVisible) return true;

    const { userAId, userBId } = canonicalizeUserPair(viewerUserId, targetUserId);

    const [candidatePair, mutualMatch, dateMatch] = await Promise.all([
        db.query.candidatePairs.findFirst({
            where: and(
                eq(candidatePairs.userAId, userAId),
                eq(candidatePairs.userBId, userBId),
                inArray(candidatePairs.status, ["active", "mutual"]),
            ),
            columns: { id: true },
        }),
        db.query.mutualMatches.findFirst({
            where: and(
                or(
                    and(eq(mutualMatches.userAId, viewerUserId), eq(mutualMatches.userBId, targetUserId)),
                    and(eq(mutualMatches.userAId, targetUserId), eq(mutualMatches.userBId, viewerUserId)),
                ),
                inArray(mutualMatches.status, ["mutual", "call_pending", "being_arranged", "upcoming", "completed"]),
            ),
            columns: { id: true },
        }),
        db.query.dateMatches.findFirst({
            where: and(
                or(
                    and(eq(dateMatches.userAId, viewerUserId), eq(dateMatches.userBId, targetUserId)),
                    and(eq(dateMatches.userAId, targetUserId), eq(dateMatches.userBId, viewerUserId)),
                ),
                inArray(dateMatches.status, ["pending_setup", "scheduled", "attended"]),
            ),
            columns: { id: true },
        }),
    ]);

    return Boolean(candidatePair || mutualMatch || dateMatch);
}
