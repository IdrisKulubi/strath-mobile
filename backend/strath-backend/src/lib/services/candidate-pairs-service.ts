import { and, desc, eq, gte, inArray, lt, ne, notInArray, or, sql } from "drizzle-orm";
import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    blocks,
    candidatePairHistory,
    candidatePairs,
    matches,
    mutualMatches,
    profiles,
} from "@/db/schema";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { getTargetGenders, isReciprocalGenderMatch } from "@/lib/gender-preferences";

export const DAILY_CANDIDATE_PAIR_LIMIT = 4;
export const ACTIVE_EXPOSURE_CAP = 4;
// TODO: revert to 24 for production — 5 min for testing cron/expiry
export const CANDIDATE_PAIR_EXPIRY_HOURS = 5 / 60;
// When expiry is 5 min (testing), use 1-min cooldown so expired pairs can be reshown. Revert to 7 for production.
export const EXPIRED_PAIR_COOLDOWN_DAYS = CANDIDATE_PAIR_EXPIRY_HOURS < 1 ? 1 / (24 * 60) : 7;

export type CandidateDecision = "pending" | "open_to_meet" | "passed";
export type CandidatePairStatus = "active" | "mutual" | "closed" | "expired";
export type MutualMatchStatus =
    | "mutual"
    | "call_pending"
    | "being_arranged"
    | "upcoming"
    | "completed"
    | "cancelled"
    | "expired";

type CandidatePairRow = typeof candidatePairs.$inferSelect;
type TransactionClient = Parameters<Parameters<typeof db.transaction>[0]>[0];

export function canonicalizePairUsers(firstUserId: string, secondUserId: string) {
    return firstUserId < secondUserId
        ? { userAId: firstUserId, userBId: secondUserId }
        : { userAId: secondUserId, userBId: firstUserId };
}

export function getPairRole(pair: Pick<CandidatePairRow, "userAId" | "userBId">, userId: string) {
    if (pair.userAId === userId) return "a";
    if (pair.userBId === userId) return "b";
    return null;
}

export function getCurrentUserDecision(pair: Pick<CandidatePairRow, "userAId" | "userBId" | "aDecision" | "bDecision">, userId: string): CandidateDecision {
    return pair.userAId === userId ? pair.aDecision : pair.bDecision;
}

export function getOtherUserId(pair: Pick<CandidatePairRow, "userAId" | "userBId">, userId: string) {
    return pair.userAId === userId ? pair.userBId : pair.userAId;
}

export function resolveCandidatePairStatus(
    aDecision: CandidateDecision,
    bDecision: CandidateDecision,
): CandidatePairStatus {
    if (aDecision === "passed" || bDecision === "passed") {
        return "closed";
    }

    if (aDecision === "open_to_meet" && bDecision === "open_to_meet") {
        return "mutual";
    }

    return "active";
}

export async function recordCandidatePairHistory(
    tx: TransactionClient,
    input: {
        pairId: string;
        actorUserId?: string | null;
        eventType: "generated" | "responded" | "mutual" | "closed" | "expired" | "bridged_to_match" | "bridged_to_date";
        fromStatus?: CandidatePairStatus;
        toStatus?: CandidatePairStatus;
        metadata?: Record<string, unknown>;
    },
) {
    await tx.insert(candidatePairHistory).values({
        pairId: input.pairId,
        actorUserId: input.actorUserId ?? null,
        eventType: input.eventType,
        fromStatus: input.fromStatus,
        toStatus: input.toStatus,
        metadata: input.metadata ?? {},
    });
}

export async function expireCandidatePairs(now = new Date()) {
    const expiryMs = CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000;
    const createdAtCutoff = new Date(now.getTime() - expiryMs);

    const expired = await db.transaction(async (tx) => {
        const rows = await tx
            .update(candidatePairs)
            .set({
                status: "expired",
                updatedAt: now,
            })
            .where(
                and(
                    eq(candidatePairs.status, "active"),
                    or(
                        lt(candidatePairs.expiresAt, now),
                        lt(candidatePairs.createdAt, createdAtCutoff),
                    ),
                ),
            )
            .returning({
                id: candidatePairs.id,
                status: candidatePairs.status,
            });

        for (const row of rows) {
            await recordCandidatePairHistory(tx, {
                pairId: row.id,
                eventType: "expired",
                fromStatus: "active",
                toStatus: "expired",
            });
        }

        return rows;
    });

    return expired;
}

export async function getActiveExposureCount(userId: string) {
    const result = await readDb
        .select({ count: sql<number>`count(*)::int` })
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "active"),
                gte(candidatePairs.expiresAt, new Date()),
                or(
                    eq(candidatePairs.userAId, userId),
                    eq(candidatePairs.userBId, userId),
                ),
            ),
        );

    return result[0]?.count ?? 0;
}

async function getExistingPairMap(userId: string) {
    const rows = await readDb
        .select()
        .from(candidatePairs)
        .where(
            or(
                eq(candidatePairs.userAId, userId),
                eq(candidatePairs.userBId, userId),
            ),
        );

    return new Map(rows.map((row) => [getOtherUserId(row, userId), row]));
}

async function getBlockedUserIds(userId: string) {
    const [blockedRows, blockedByRows] = await Promise.all([
        readDb
            .select({ id: blocks.blockedId })
            .from(blocks)
            .where(eq(blocks.blockerId, userId)),
        readDb
            .select({ id: blocks.blockerId })
            .from(blocks)
            .where(eq(blocks.blockedId, userId)),
    ]);

    return new Set([
        ...blockedRows.map((row) => row.id),
        ...blockedByRows.map((row) => row.id),
    ]);
}

async function getMatchedUserIds(userId: string) {
    const legacyMatches = await readDb
        .select({
            user1Id: matches.user1Id,
            user2Id: matches.user2Id,
        })
        .from(matches)
        .where(
            or(
                eq(matches.user1Id, userId),
                eq(matches.user2Id, userId),
            ),
        );

    const mutualRows = await readDb
        .select({
            userAId: mutualMatches.userAId,
            userBId: mutualMatches.userBId,
        })
        .from(mutualMatches)
        .where(
            and(
                ne(mutualMatches.status, "cancelled"),
                or(
                    eq(mutualMatches.userAId, userId),
                    eq(mutualMatches.userBId, userId),
                ),
            ),
        );

    return new Set([
        ...legacyMatches.map((row) => (row.user1Id === userId ? row.user2Id : row.user1Id)),
        ...mutualRows.map((row) => (row.userAId === userId ? row.userBId : row.userAId)),
    ]);
}

function buildBoostedCompatibilityScore(
    baseScore: number,
    currentProfile: typeof profiles.$inferSelect,
    candidateProfile: typeof profiles.$inferSelect,
    candidateUserLastActive?: Date | null,
) {
    let score = baseScore;

    if (currentProfile.university && candidateProfile.university && currentProfile.university === candidateProfile.university) {
        score += 6;
    }

    if (candidateUserLastActive) {
        const daysSinceActive = (Date.now() - candidateUserLastActive.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceActive <= 2) score += 4;
        else if (daysSinceActive <= 7) score += 2;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
}

function buildReasons(
    baseReasons: string[],
    currentProfile: typeof profiles.$inferSelect,
    candidateProfile: typeof profiles.$inferSelect,
): string[] {
    const reasons = [...baseReasons];

    if (
        currentProfile.university &&
        candidateProfile.university &&
        currentProfile.university === candidateProfile.university &&
        !reasons.includes("Same university")
    ) {
        reasons.unshift("Same university");
    }

    return Array.from(new Set(reasons)).slice(0, 4);
}

export async function generateCandidatePairsForUser(userId: string) {
    console.log("[candidate-pairs] generateCandidatePairsForUser", { userId });

    await expireCandidatePairs();

    const existingActivePairs = await getActiveCandidatePairsForUser(userId);
    if (existingActivePairs.length > 0) {
        console.log("[candidate-pairs] returning existing pairs:", existingActivePairs.length);
        return existingActivePairs;
    }

    const currentProfile = await readDb.query.profiles.findFirst({
        where: eq(profiles.userId, userId),
    });

    if (!currentProfile) {
        console.log("[candidate-pairs] SKIP: no profile found for user");
        return [];
    }

    const profileReasons: string[] = [];
    if (!currentProfile.profileCompleted) profileReasons.push("profileCompleted=false");
    if (!currentProfile.isVisible) profileReasons.push("isVisible=false");
    if (currentProfile.discoveryPaused) profileReasons.push("discoveryPaused=true");
    if (currentProfile.incognitoMode) profileReasons.push("incognitoMode=true");

    if (profileReasons.length > 0) {
        console.log("[candidate-pairs] SKIP: profile ineligible:", profileReasons);
        return [];
    }

    const blockedIds = await getBlockedUserIds(userId);
    const matchedIds = await getMatchedUserIds(userId);
    const existingPairMap = await getExistingPairMap(userId);
    const targetGenders = getTargetGenders(
        currentProfile.gender,
        currentProfile.interestedIn as string[] | null,
    );

    const excludedIds = [
        userId,
        ...blockedIds,
        ...matchedIds,
    ];

    const candidateProfiles = await readDb.query.profiles.findMany({
        where: and(
            notInArray(profiles.userId, excludedIds),
            eq(profiles.isVisible, true),
            eq(profiles.profileCompleted, true),
            eq(profiles.discoveryPaused, false),
            eq(profiles.incognitoMode, false),
            targetGenders.length > 0 ? inArray(profiles.gender, targetGenders) : undefined,
        ),
        with: { user: true },
        limit: 60,
    });

    console.log("[candidate-pairs] pool:", {
        candidateProfilesCount: candidateProfiles.length,
        excludedIdsCount: excludedIds.length,
        blockedCount: blockedIds.size,
        matchedCount: matchedIds.size,
        targetGenders: targetGenders.length > 0 ? targetGenders : "any",
        cooldownDays: EXPIRED_PAIR_COOLDOWN_DAYS,
        existingPairsInMap: existingPairMap.size,
    });

    const cooldownCutoff = new Date(Date.now() - EXPIRED_PAIR_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

    const reciprocalCandidates = candidateProfiles.filter((candidate) => {
        if (!isReciprocalGenderMatch(currentProfile.gender, candidate.gender, candidate.interestedIn as string[] | null)) {
            return false;
        }

        const existingPair = existingPairMap.get(candidate.userId);
        if (!existingPair) return true;

        if (existingPair.status === "closed" || existingPair.status === "mutual") {
            return false;
        }

        if (existingPair.status === "active") {
            return false;
        }

        return existingPair.createdAt < cooldownCutoff;
    });

    console.log("[candidate-pairs] after reciprocal filter:", reciprocalCandidates.length);

    const scoredCandidates = await Promise.all(
        reciprocalCandidates.map(async (candidate) => {
            const exposureCount = await getActiveExposureCount(candidate.userId);
            if (exposureCount >= ACTIVE_EXPOSURE_CAP) {
                return null;
            }

            const { score, reasons } = await computeCompatibility(userId, candidate.userId);

            return {
                candidate,
                score: buildBoostedCompatibilityScore(
                    score,
                    currentProfile,
                    candidate,
                    candidate.user?.lastActive ?? candidate.lastActive ?? null,
                ),
                reasons: buildReasons(reasons, currentProfile, candidate),
            };
        }),
    );

    const selected = scoredCandidates
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .sort((left, right) => right.score - left.score)
        .slice(0, DAILY_CANDIDATE_PAIR_LIMIT);

    const filteredByExposure = scoredCandidates.filter((e) => e === null).length;
    if (filteredByExposure > 0) {
        console.log("[candidate-pairs] filtered by exposure cap:", filteredByExposure);
    }

    if (selected.length === 0) {
        console.log("[candidate-pairs] SKIP: no eligible candidates after scoring (reciprocal:", reciprocalCandidates.length, ", selected: 0)");
        return [];
    }

    console.log("[candidate-pairs] selected:", selected.length, "pairs");

    const now = new Date();
    const expiresAt = new Date(now.getTime() + CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000);

    await db.transaction(async (tx) => {
        for (const entry of selected) {
            const { userAId, userBId } = canonicalizePairUsers(userId, entry.candidate.userId);
            const existing = await tx.query.candidatePairs.findFirst({
                where: and(
                    eq(candidatePairs.userAId, userAId),
                    eq(candidatePairs.userBId, userBId),
                    eq(candidatePairs.status, "active"),
                ),
            });

            if (existing) continue;

            const [pair] = await tx
                .insert(candidatePairs)
                .values({
                    userAId,
                    userBId,
                    compatibilityScore: entry.score,
                    matchReasons: entry.reasons,
                    shownToAAt: now,
                    shownToBAt: now,
                    expiresAt,
                    status: "active",
                    aDecision: "pending",
                    bDecision: "pending",
                })
                .returning({ id: candidatePairs.id });

            await recordCandidatePairHistory(tx, {
                pairId: pair.id,
                eventType: "generated",
                toStatus: "active",
                metadata: {
                    score: entry.score,
                    reasons: entry.reasons,
                },
            });
        }
    });

    const result = await getActiveCandidatePairsForUser(userId);
    console.log("[candidate-pairs] created", result.length, "pairs for user");
    return result;
}

export async function getActiveCandidatePairsForUser(userId: string) {
    const now = new Date();
    const expiryMs = CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000;
    const createdAtCutoff = new Date(now.getTime() - expiryMs);

    const rows = await readDb
        .select()
        .from(candidatePairs)
        .where(
            and(
                eq(candidatePairs.status, "active"),
                gte(candidatePairs.expiresAt, now),
                gte(candidatePairs.createdAt, createdAtCutoff),
                or(
                    eq(candidatePairs.userAId, userId),
                    eq(candidatePairs.userBId, userId),
                ),
            ),
        )
        .orderBy(desc(candidatePairs.compatibilityScore), desc(candidatePairs.createdAt));

    const result = await Promise.all(
        rows.map(async (pair) => {
            const otherUserId = getOtherUserId(pair, userId);
            const profile = await readDb.query.profiles.findFirst({
                where: eq(profiles.userId, otherUserId),
                with: { user: true },
            });

            if (!profile) return null;

            const interests = Array.isArray(profile.interests) ? profile.interests : [];
            const personalityAnswers = profile.personalityAnswers as Record<string, unknown> | null;
            const personalityTags: string[] = [];
            if (personalityAnswers?.sleepSchedule) personalityTags.push(String(personalityAnswers.sleepSchedule).replace(/_/g, " "));
            if (personalityAnswers?.socialBattery) personalityTags.push(String(personalityAnswers.socialBattery).replace(/_/g, " "));
            if (personalityAnswers?.convoStyle) personalityTags.push(String(personalityAnswers.convoStyle).replace(/_/g, " "));

            return {
                pairId: pair.id,
                userId: otherUserId,
                firstName: profile.firstName || profile.user?.name?.split(" ")[0] || "Unknown",
                age: profile.age ?? 0,
                profilePhoto: profile.profilePhoto ?? profile.user?.profilePhoto ?? profile.user?.image,
                compatibilityScore: pair.compatibilityScore,
                reasons: pair.matchReasons,
                bio: profile.bio ?? profile.aboutMe ?? undefined,
                interests,
                personalityTags,
                course: profile.course ?? undefined,
                university: profile.university ?? undefined,
                currentUserDecision: getCurrentUserDecision(pair, userId),
                status: pair.status,
                expiresAt: pair.expiresAt.toISOString(),
                expiresInMs: Math.max(0, pair.expiresAt.getTime() - now.getTime()),
            };
        }),
    );

    return result.filter((row): row is NonNullable<typeof row> => Boolean(row));
}

export async function getCandidatePairByIdForUser(pairId: string, userId: string) {
    const pair = await readDb.query.candidatePairs.findFirst({
        where: eq(candidatePairs.id, pairId),
    });

    if (!pair) return null;
    if (pair.userAId !== userId && pair.userBId !== userId) return null;
    return pair;
}

export async function findActiveCandidatePairBetweenUsers(userId: string, otherUserId: string) {
    const { userAId, userBId } = canonicalizePairUsers(userId, otherUserId);
    return readDb.query.candidatePairs.findFirst({
        where: and(
            eq(candidatePairs.userAId, userAId),
            eq(candidatePairs.userBId, userBId),
            eq(candidatePairs.status, "active"),
            gte(candidatePairs.expiresAt, new Date()),
        ),
    });
}

export async function respondToCandidatePair(
    pairId: string,
    userId: string,
    decision: Exclude<CandidateDecision, "pending">,
) {
    const now = new Date();

    return db.transaction(async (tx) => {
        const pair = await tx.query.candidatePairs.findFirst({
            where: eq(candidatePairs.id, pairId),
        });

        if (!pair) {
            throw new Error("Candidate pair not found");
        }

        const role = getPairRole(pair, userId);
        if (!role) {
            throw new Error("You do not belong to this pair");
        }

        if (pair.status !== "active") {
            throw new Error("This pair is no longer active");
        }

        if (pair.expiresAt < now) {
            throw new Error("This pair has expired");
        }

        if ((role === "a" && pair.aDecision !== "pending") || (role === "b" && pair.bDecision !== "pending")) {
            throw new Error("You have already responded to this pair");
        }

        const nextADecision = role === "a" ? decision : pair.aDecision;
        const nextBDecision = role === "b" ? decision : pair.bDecision;

        const nextStatus = resolveCandidatePairStatus(nextADecision, nextBDecision);

        const [updatedPair] = await tx
            .update(candidatePairs)
            .set({
                aDecision: nextADecision,
                bDecision: nextBDecision,
                status: nextStatus,
                updatedAt: now,
            })
            .where(eq(candidatePairs.id, pairId))
            .returning();

        await recordCandidatePairHistory(tx, {
            pairId,
            actorUserId: userId,
            eventType:
                nextStatus === "mutual"
                    ? "mutual"
                    : nextStatus === "closed"
                        ? "closed"
                        : "responded",
            fromStatus: pair.status,
            toStatus: nextStatus,
            metadata: {
                decision,
                aDecision: nextADecision,
                bDecision: nextBDecision,
            },
        });

        let mutual = null;
        if (nextStatus === "mutual") {
            mutual = await tx.query.mutualMatches.findFirst({
                where: eq(mutualMatches.candidatePairId, pairId),
            });

            if (!mutual) {
                const [createdMutual] = await tx
                    .insert(mutualMatches)
                    .values({
                        candidatePairId: pairId,
                        userAId: updatedPair.userAId,
                        userBId: updatedPair.userBId,
                        status: "mutual",
                    })
                    .returning();
                mutual = createdMutual;
            }
        }

        return { pair: updatedPair, mutual };
    });
}
