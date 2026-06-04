"use server";

import { revalidatePath } from "next/cache";
import { and, desc, eq, gte, inArray, isNull, notInArray, or, sql } from "drizzle-orm";

import { candidatePairHistory, candidatePairs, dailyShortlists, dateMatches, mutualMatches, profiles, user } from "@/db/schema";
import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import { requireAdmin } from "@/lib/admin-auth";
import {
    MANUAL_CURATED_PAIR_EXPIRES_AT,
    canonicalizePairUsers,
    generateCandidatePairsForUser,
    getActiveCandidatePairsForUser,
    recordCandidatePairHistory,
} from "@/lib/services/candidate-pairs-service";
import { resolveMatchExcludedUserIds } from "@/lib/services/match-exclusion-service";
import { releaseStalePreDateMatchHolds } from "@/lib/services/match-hold-service";
import { hasCompletedInitialFaceVerification } from "@/lib/matchmaking-pool-eligibility";
import { computeCompatibility } from "@/lib/services/compatibility-service";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

const HOLD_STATUSES = ["mutual", "being_arranged", "upcoming"] as const;
const SHUFFLE_HOLD_STATUSES = ["mutual", "being_arranged", "upcoming", "completed"] as const;
const BUSY_PAIR_STATUSES = ["active", "queued", "mutual"] as const;

function utcDayKey(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString().slice(0, 10);
}

type ManualMatchState = "available" | "active_pair" | "mutual_hold" | "unavailable";

export type ManualMatchmakingProfile = {
    userId: string;
    name: string;
    email: string;
    phoneNumber: string | null;
    pushEnabled: boolean;
    role: "user" | "admin" | null;
    firstName: string;
    lastName: string;
    age: number | null;
    gender: string | null;
    profilePhoto: string | null;
    photos: string[];
    bio: string | null;
    aboutMe: string | null;
    course: string | null;
    university: string | null;
    yearOfStudy: number | null;
    lookingFor: string | null;
    interests: string[];
    qualities: string[];
    prompts: { promptId: string; response: string }[];
    personalityAnswers: Record<string, unknown> | null;
    lifestyleAnswers: Record<string, unknown> | null;
    faceVerificationStatus: string | null;
    faceVerifiedAt: string | null;
    faceVerificationMethod: string | null;
    waitlistStatus: "admitted" | "waitlisted" | null;
    profileComplete: boolean;
    isVisible: boolean | null;
    discoveryPaused: boolean | null;
    lastActive: string;
    createdAt: string;
    activeState: ManualMatchState;
    activePairId: string | null;
    activeMutualMatchId: string | null;
    activePartnerName: string | null;
    stats: {
        totalPairs: number;
        interested: number;
        passed: number;
        mutual: number;
    };
};

export type ManualMatchSuggestion = ManualMatchmakingProfile & {
    compatibilityScore: number;
    reasons: string[];
    warnings: string[];
};

function arrayValue<T>(value: T[] | null | undefined): T[] {
    return Array.isArray(value) ? value : [];
}

function displayName(profile: { firstName?: string | null; lastName?: string | null }, fallback: string) {
    return [profile.firstName, profile.lastName].filter(Boolean).join(" ").trim() || fallback;
}

function normalizeGender(value: string | null) {
    const normalized = value?.trim().toLowerCase();
    if (!normalized) return null;
    if (["female", "woman", "lady", "girl", "f"].includes(normalized)) return "female";
    if (["male", "man", "guy", "boy", "m"].includes(normalized)) return "male";
    return normalized;
}

function isOppositeGenderMatch(selectedGender: string | null, candidateGender: string | null) {
    const selected = normalizeGender(selectedGender);
    const candidate = normalizeGender(candidateGender);
    if (selected === "female") return candidate === "male";
    if (selected === "male") return candidate === "female";
    return true;
}

function isManualMatchReady(profile: Pick<ManualMatchmakingProfile, "faceVerificationStatus" | "faceVerifiedAt" | "waitlistStatus">) {
    if (profile.waitlistStatus === "waitlisted") {
        return false;
    }
    return hasCompletedInitialFaceVerification(profile);
}

function manualAvailabilityIssue(profile: Pick<ManualMatchmakingProfile, "profileComplete">) {
    if (!profile.profileComplete) return "profile is incomplete";
    return null;
}

async function getAdminCuratedPairIds() {
    const rows = await readDb
        .select({ pairId: candidatePairHistory.pairId })
        .from(candidatePairHistory)
        .where(
            and(
                eq(candidatePairHistory.eventType, "generated"),
                sql`${candidatePairHistory.metadata}->>'source' in ('admin_curated', 'admin_restore')`,
            ),
        );

    return new Set(rows.map((row) => row.pairId));
}

async function getPoolData() {
    const rows = await readDb
        .select({
            userId: user.id,
            name: user.name,
            email: user.email,
            userPhoneNumber: user.phoneNumber,
            pushToken: user.pushToken,
            role: user.role,
            lastActive: user.lastActive,
            createdAt: user.createdAt,
            profileId: profiles.id,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            profilePhoneNumber: profiles.phoneNumber,
            age: profiles.age,
            gender: profiles.gender,
            profilePhoto: profiles.profilePhoto,
            userProfilePhoto: user.profilePhoto,
            userImage: user.image,
            photos: profiles.photos,
            bio: profiles.bio,
            aboutMe: profiles.aboutMe,
            course: profiles.course,
            university: profiles.university,
            yearOfStudy: profiles.yearOfStudy,
            lookingFor: profiles.lookingFor,
            interests: profiles.interests,
            qualities: profiles.qualities,
            prompts: profiles.prompts,
            personalityAnswers: profiles.personalityAnswers,
            lifestyleAnswers: profiles.lifestyleAnswers,
            faceVerificationStatus: profiles.faceVerificationStatus,
            faceVerifiedAt: profiles.faceVerifiedAt,
            faceVerificationMethod: profiles.faceVerificationMethod,
            waitlistStatus: profiles.waitlistStatus,
            profileCompleted: profiles.profileCompleted,
            isComplete: profiles.isComplete,
            isVisible: profiles.isVisible,
            discoveryPaused: profiles.discoveryPaused,
        })
        .from(user)
        .innerJoin(profiles, eq(profiles.userId, user.id))
        .where(isNull(user.deletedAt))
        .orderBy(desc(user.lastActive), desc(user.createdAt));

    const eligibleRows = rows.filter((row) => hasCompletedInitialFaceVerification(row));

    const userIds = eligibleRows.map((row) => row.userId);
    const now = new Date();

    const [busyPairs, activeMutuals, allPairs] = userIds.length > 0
        ? await Promise.all([
            readDb
                .select()
                .from(candidatePairs)
                .where(
                    and(
                        inArray(candidatePairs.status, [...BUSY_PAIR_STATUSES]),
                        or(
                            inArray(candidatePairs.userAId, userIds),
                            inArray(candidatePairs.userBId, userIds),
                        ),
                        gte(candidatePairs.expiresAt, now),
                    ),
                ),
            readDb
                .select()
                .from(mutualMatches)
                .where(
                    and(
                        inArray(mutualMatches.status, [...HOLD_STATUSES]),
                        or(
                            inArray(mutualMatches.userAId, userIds),
                            inArray(mutualMatches.userBId, userIds),
                        ),
                    ),
                ),
            readDb
                .select()
                .from(candidatePairs)
                .where(
                    or(
                        inArray(candidatePairs.userAId, userIds),
                        inArray(candidatePairs.userBId, userIds),
                    ),
                ),
        ])
        : [[], [], []];

    const profileNameByUserId = new Map<string, string>();
    for (const row of eligibleRows) {
        profileNameByUserId.set(row.userId, displayName(row, row.name));
    }

    const activePairByUserId = new Map<string, typeof busyPairs[number]>();
    for (const pair of busyPairs) {
        if (!activePairByUserId.has(pair.userAId)) activePairByUserId.set(pair.userAId, pair);
        if (!activePairByUserId.has(pair.userBId)) activePairByUserId.set(pair.userBId, pair);
    }

    const activeMutualByUserId = new Map<string, typeof activeMutuals[number]>();
    for (const match of activeMutuals) {
        if (!activeMutualByUserId.has(match.userAId)) activeMutualByUserId.set(match.userAId, match);
        if (!activeMutualByUserId.has(match.userBId)) activeMutualByUserId.set(match.userBId, match);
    }

    const statsByUserId = new Map<string, ManualMatchmakingProfile["stats"]>();
    const ensureStats = (userId: string) => {
        const existing = statsByUserId.get(userId);
        if (existing) return existing;
        const fresh = { totalPairs: 0, interested: 0, passed: 0, mutual: 0 };
        statsByUserId.set(userId, fresh);
        return fresh;
    };

    for (const pair of allPairs) {
        for (const side of [
            { userId: pair.userAId, decision: pair.aDecision },
            { userId: pair.userBId, decision: pair.bDecision },
        ]) {
            const stats = ensureStats(side.userId);
            stats.totalPairs += 1;
            if (side.decision === "open_to_meet") stats.interested += 1;
            if (side.decision === "passed") stats.passed += 1;
            if (pair.status === "mutual") stats.mutual += 1;
        }
    }

    const items = eligibleRows.map((row): ManualMatchmakingProfile => {
        const activePair = activePairByUserId.get(row.userId);
        const activeMutual = activeMutualByUserId.get(row.userId);
        const partnerId = activeMutual
            ? activeMutual.userAId === row.userId ? activeMutual.userBId : activeMutual.userAId
            : activePair
                ? activePair.userAId === row.userId ? activePair.userBId : activePair.userAId
                : null;

        const profileComplete = Boolean(row.profileCompleted || row.isComplete);
        const activeState: ManualMatchState = activeMutual
            ? "mutual_hold"
            : activePair
                ? "active_pair"
            : !profileComplete
                ? "unavailable"
                : "available";

        return {
            userId: row.userId,
            name: row.name,
            email: row.email,
            phoneNumber: row.profilePhoneNumber ?? row.userPhoneNumber,
            pushEnabled: Boolean(row.pushToken),
            role: row.role,
            firstName: row.firstName,
            lastName: row.lastName,
            age: row.age,
            gender: row.gender,
            profilePhoto: row.profilePhoto ?? row.userProfilePhoto ?? row.userImage,
            photos: arrayValue(row.photos),
            bio: row.bio,
            aboutMe: row.aboutMe,
            course: row.course,
            university: row.university,
            yearOfStudy: row.yearOfStudy,
            lookingFor: row.lookingFor,
            interests: arrayValue(row.interests),
            qualities: arrayValue(row.qualities),
            prompts: arrayValue(row.prompts),
            personalityAnswers: row.personalityAnswers as Record<string, unknown> | null,
            lifestyleAnswers: row.lifestyleAnswers as Record<string, unknown> | null,
            faceVerificationStatus: row.faceVerificationStatus,
            faceVerifiedAt: row.faceVerifiedAt?.toISOString() ?? null,
            faceVerificationMethod: row.faceVerificationMethod,
            waitlistStatus: row.waitlistStatus,
            profileComplete,
            isVisible: row.isVisible,
            discoveryPaused: row.discoveryPaused,
            lastActive: row.lastActive.toISOString(),
            createdAt: row.createdAt.toISOString(),
            activeState,
            activePairId: activePair?.id ?? null,
            activeMutualMatchId: activeMutual?.id ?? null,
            activePartnerName: partnerId ? profileNameByUserId.get(partnerId) ?? partnerId : null,
            stats: statsByUserId.get(row.userId) ?? { totalPairs: 0, interested: 0, passed: 0, mutual: 0 },
        };
    });

    return items;
}

export async function getManualMatchmakingPool() {
    await requireAdmin();
    return getPoolData();
}

export type ZeroMatchRecoveryUser = {
    userId: string;
    name: string;
    email: string;
    gender: string | null;
    interestedIn: string[];
    createdAt: string;
    lastActive: string;
    pushEnabled: boolean;
    profileStatus: string;
    verificationStatus: string;
    candidatePoolSize: number;
    reason: "no_active_pairs" | "no_push_token" | "candidate_pool_empty";
};

export type ZeroMatchGenerationResult = {
    userId: string;
    activeMatches: number;
    notificationSent: boolean;
    notificationFailed: boolean;
};

async function collectZeroMatchUsers(): Promise<ZeroMatchRecoveryUser[]> {
    const matchExcludedUserIds = await resolveMatchExcludedUserIds();
    const rows = await readDb
        .select({
            userId: user.id,
            name: user.name,
            email: user.email,
            pushToken: user.pushToken,
            lastActive: user.lastActive,
            createdAt: user.createdAt,
            firstName: profiles.firstName,
            lastName: profiles.lastName,
            gender: profiles.gender,
            interestedIn: profiles.interestedIn,
            profileCompleted: profiles.profileCompleted,
            isComplete: profiles.isComplete,
            isVisible: profiles.isVisible,
            discoveryPaused: profiles.discoveryPaused,
            incognitoMode: profiles.incognitoMode,
            waitlistStatus: profiles.waitlistStatus,
            faceVerificationStatus: profiles.faceVerificationStatus,
            faceVerifiedAt: profiles.faceVerifiedAt,
        })
        .from(user)
        .innerJoin(profiles, eq(profiles.userId, user.id))
        .where(isNull(user.deletedAt))
        .orderBy(desc(user.createdAt));

    const eligibleRows = rows.filter((row) => {
        const profileComplete = Boolean(row.profileCompleted || row.isComplete);
        return profileComplete
            && row.isVisible !== false
            && row.discoveryPaused !== true
            && row.incognitoMode !== true
            && row.waitlistStatus !== "waitlisted"
            && !matchExcludedUserIds.has(row.userId)
            && hasCompletedInitialFaceVerification(row);
    });

    const userIds = eligibleRows.map((row) => row.userId);
    if (userIds.length === 0) return [];

    const now = new Date();
    const [activePairs, heldMatches] = await Promise.all([
        readDb
            .select({
                userAId: candidatePairs.userAId,
                userBId: candidatePairs.userBId,
            })
            .from(candidatePairs)
            .where(
                and(
                    eq(candidatePairs.status, "active"),
                    gte(candidatePairs.expiresAt, now),
                    or(
                        inArray(candidatePairs.userAId, userIds),
                        inArray(candidatePairs.userBId, userIds),
                    ),
                ),
            ),
        readDb
            .select({
                userAId: mutualMatches.userAId,
                userBId: mutualMatches.userBId,
            })
            .from(mutualMatches)
            .where(
                and(
                    inArray(mutualMatches.status, [...SHUFFLE_HOLD_STATUSES]),
                    or(
                        inArray(mutualMatches.userAId, userIds),
                        inArray(mutualMatches.userBId, userIds),
                    ),
                ),
            ),
    ]);

    const activeCountByUserId = new Map<string, number>();
    const addActive = (userId: string) => activeCountByUserId.set(userId, (activeCountByUserId.get(userId) ?? 0) + 1);
    for (const pair of activePairs) {
        addActive(pair.userAId);
        addActive(pair.userBId);
    }

    const heldUserIds = new Set(heldMatches.flatMap((match) => [match.userAId, match.userBId]));

    return eligibleRows
        .filter((row) => !heldUserIds.has(row.userId))
        .filter((row) => (activeCountByUserId.get(row.userId) ?? 0) === 0)
        .map((row) => {
            const interestedIn = arrayValue(row.interestedIn as string[] | null);
            const candidatePoolSize = eligibleRows.filter((candidate) => (
                candidate.userId !== row.userId
                && !heldUserIds.has(candidate.userId)
                && isOppositeGenderMatch(row.gender, candidate.gender)
                && isOppositeGenderMatch(candidate.gender, row.gender)
            )).length;
            const reason = candidatePoolSize === 0
                ? "candidate_pool_empty"
                : row.pushToken
                    ? "no_active_pairs"
                    : "no_push_token";

            return {
                userId: row.userId,
                name: displayName(row, row.name),
                email: row.email,
                gender: row.gender,
                interestedIn,
                createdAt: row.createdAt.toISOString(),
                lastActive: row.lastActive.toISOString(),
                pushEnabled: Boolean(row.pushToken),
                profileStatus: "eligible",
                verificationStatus: row.faceVerificationStatus ?? (row.faceVerifiedAt ? "verified" : "unknown"),
                candidatePoolSize,
                reason,
            };
        });
}

async function sendZeroMatchRecoveryPush(userId: string) {
    const row = await readDb.query.user.findFirst({
        where: eq(user.id, userId),
        columns: { pushToken: true },
    });

    if (!row?.pushToken) return { sent: false, failed: false };

    const result = await sendPushNotification(row.pushToken, {
        title: "New matches are ready",
        body: "Open StrathSpace to see who we found for you.",
        data: {
            type: NOTIFICATION_TYPES.NEW_CANDIDATE_MATCH,
            route: "/(tabs)",
        },
    });

    return { sent: Boolean(result), failed: !result };
}

async function generateForZeroMatchUser(userId: string): Promise<ZeroMatchGenerationResult> {
    const matches = await generateCandidatePairsForUser(userId, { notify: false });
    const activeMatches = matches.length > 0
        ? matches.length
        : (await getActiveCandidatePairsForUser(userId)).length;
    const notification = activeMatches > 0
        ? await sendZeroMatchRecoveryPush(userId)
        : { sent: false, failed: false };

    return {
        userId,
        activeMatches,
        notificationSent: notification.sent,
        notificationFailed: notification.failed,
    };
}

export async function getZeroMatchUsers() {
    await requireAdmin();
    return collectZeroMatchUsers();
}

export async function generateMatchesForZeroMatchUser(userId: string) {
    await requireAdmin();
    const result = await generateForZeroMatchUser(userId);
    revalidatePath("/admin");
    revalidatePath("/admin/matchmaking");
    return result;
}

export async function generateMatchesForAllZeroMatchUsers() {
    await requireAdmin();
    const zeroMatchUsers = await collectZeroMatchUsers();
    const results: ZeroMatchGenerationResult[] = [];

    for (const zeroMatchUser of zeroMatchUsers) {
        results.push(await generateForZeroMatchUser(zeroMatchUser.userId));
    }

    const generatedFor = results.filter((result) => result.activeMatches > 0).length;
    const notificationsSent = results.filter((result) => result.notificationSent).length;
    const notificationFailures = results.filter((result) => result.notificationFailed).length;

    revalidatePath("/admin");
    revalidatePath("/admin/matchmaking");

    return {
        checked: zeroMatchUsers.length,
        generatedFor,
        stillZero: zeroMatchUsers.length - generatedFor,
        skipped: 0,
        notificationsSent,
        notificationFailures,
        results,
    };
}

export async function getManualMatchSuggestions(userId: string) {
    await requireAdmin();
    const pool = await getPoolData();
    const selected = pool.find((item) => item.userId === userId);
    if (!selected) throw new Error("Selected user not found");

    const candidates = pool.filter((item) => (
        item.userId !== userId
        && isManualMatchReady(item)
        && isOppositeGenderMatch(selected.gender, item.gender)
    ));
    const suggestions = await Promise.all(
        candidates.map(async (candidate): Promise<ManualMatchSuggestion> => {
            const compatibility = await computeCompatibility(userId, candidate.userId);
            const warnings: string[] = [];
            if (candidate.activeState === "active_pair") warnings.push(`Already has active card with ${candidate.activePartnerName ?? "someone"}`);
            if (candidate.activeState === "mutual_hold") warnings.push(`Already matched with ${candidate.activePartnerName ?? "someone"}`);
            if (!candidate.pushEnabled) warnings.push("No push token");
            return {
                ...candidate,
                compatibilityScore: compatibility.score,
                reasons: compatibility.reasons,
                warnings,
            };
        }),
    );

    return suggestions
        .sort((left, right) => right.compatibilityScore - left.compatibilityScore)
        .slice(0, 30);
}

export async function createManualCandidatePair(userAId: string, userBId: string) {
    const session = await requireAdmin();
    if (!userAId || !userBId || userAId === userBId) {
        throw new Error("Choose two different users");
    }

    const pool = await getPoolData();
    const first = pool.find((item) => item.userId === userAId);
    const second = pool.find((item) => item.userId === userBId);
    if (!first || !second) throw new Error("Could not find both users");
    const firstIssue = manualAvailabilityIssue(first);
    const secondIssue = manualAvailabilityIssue(second);
    if (firstIssue) throw new Error(`${displayName(first, first.name)} cannot be matched because ${firstIssue}`);
    if (secondIssue) throw new Error(`${displayName(second, second.name)} cannot be matched because ${secondIssue}`);

    const { userAId: canonicalAId, userBId: canonicalBId } = canonicalizePairUsers(userAId, userBId);
    const compatibility = await computeCompatibility(canonicalAId, canonicalBId);
    const now = new Date();
    const expiresAt = MANUAL_CURATED_PAIR_EXPIRES_AT;

    const [created] = await db.transaction(async (tx) => {
        const existing = await tx.query.candidatePairs.findFirst({
            where: and(
                eq(candidatePairs.userAId, canonicalAId),
                eq(candidatePairs.userBId, canonicalBId),
                inArray(candidatePairs.status, [...BUSY_PAIR_STATUSES]),
            ),
        });
        if (existing) {
            await tx
                .delete(candidatePairs)
                .where(
                    and(
                        eq(candidatePairs.userAId, existing.userAId),
                        eq(candidatePairs.userBId, existing.userBId),
                        eq(candidatePairs.status, "closed"),
                        sql`${candidatePairs.id} <> ${existing.id}`,
                    ),
                );

            await tx
                .update(candidatePairs)
                .set({ status: "closed", updatedAt: now })
                .where(eq(candidatePairs.id, existing.id));

            await recordCandidatePairHistory(tx, {
                pairId: existing.id,
                actorUserId: session.user.id,
                eventType: "closed",
                fromStatus: existing.status,
                toStatus: "closed",
                metadata: {
                    source: "admin_curated",
                    reason: "superseded_by_new_manual_match",
                    adminUserId: session.user.id,
                },
            });
        }

        const [pair] = await tx
            .insert(candidatePairs)
            .values({
                userAId: canonicalAId,
                userBId: canonicalBId,
                compatibilityScore: compatibility.score,
                matchReasons: compatibility.reasons,
                shownToAAt: now,
                shownToBAt: now,
                aDecision: "pending",
                bDecision: "pending",
                status: "active",
                expiresAt,
                createdAt: now,
                updatedAt: now,
            })
            .returning();

        await recordCandidatePairHistory(tx, {
            pairId: pair.id,
            actorUserId: session.user.id,
            eventType: "generated",
            toStatus: "active",
            metadata: {
                source: "admin_curated",
                adminUserId: session.user.id,
            },
        });

        return [pair];
    });

    const users = await readDb
        .select({ id: user.id, pushToken: user.pushToken })
        .from(user)
        .where(inArray(user.id, [canonicalAId, canonicalBId]));

    await Promise.all(
        users.map((row) => row.pushToken
            ? sendPushNotification(row.pushToken, {
                title: "We found someone for you",
                body: "Open StrathSpace to see the match we curated for you.",
                data: {
                    type: NOTIFICATION_TYPES.NEW_CANDIDATE_MATCH,
                    pairId: created.id,
                },
            })
            : Promise.resolve()),
    );

    revalidatePath("/admin/matchmaking");
    return { pairId: created.id };
}

export async function cancelManualCandidatePair(pairId: string, reason = "Admin cancelled after review") {
    const session = await requireAdmin();
    if (!pairId) throw new Error("Missing pair id");
    const now = new Date();

    await db.transaction(async (tx) => {
        const pair = await tx.query.candidatePairs.findFirst({ where: eq(candidatePairs.id, pairId) });
        if (!pair) throw new Error("Candidate pair not found");

        if (pair.status === "active" || pair.status === "queued") {
            await tx
                .delete(candidatePairs)
                .where(
                    and(
                        eq(candidatePairs.userAId, pair.userAId),
                        eq(candidatePairs.userBId, pair.userBId),
                        eq(candidatePairs.status, "closed"),
                        sql`${candidatePairs.id} <> ${pairId}`,
                    ),
                );

            await tx
                .update(candidatePairs)
                .set({ status: "closed", updatedAt: now })
                .where(eq(candidatePairs.id, pairId));

            await recordCandidatePairHistory(tx, {
                pairId,
                actorUserId: session.user.id,
                eventType: "closed",
                fromStatus: pair.status,
                toStatus: "closed",
                metadata: {
                    source: "admin_curated",
                    reason,
                    adminUserId: session.user.id,
                },
            });
        }

        const mutual = await tx.query.mutualMatches.findFirst({
            where: eq(mutualMatches.candidatePairId, pairId),
        });

        if (mutual && mutual.status !== "cancelled") {
            await tx
                .update(mutualMatches)
                .set({ status: "cancelled", updatedAt: now })
                .where(eq(mutualMatches.id, mutual.id));

            if (mutual.legacyDateMatchId) {
                await tx
                    .update(dateMatches)
                    .set({ status: "cancelled" })
                    .where(eq(dateMatches.id, mutual.legacyDateMatchId));
            }
        }
    });

    revalidatePath("/admin/matchmaking");
    return { ok: true };
}

export async function reshuffleDailyMatchesForAvailableUsers() {
    const session = await requireAdmin();
    const now = new Date();
    const today = utcDayKey(now);
    const releasedStaleHolds = await releaseStalePreDateMatchHolds(now);

    const eligibleRows = await readDb
        .select({
            userId: profiles.userId,
            faceVerificationStatus: profiles.faceVerificationStatus,
            faceVerifiedAt: profiles.faceVerifiedAt,
            waitlistStatus: profiles.waitlistStatus,
        })
        .from(profiles)
        .innerJoin(user, eq(user.id, profiles.userId))
        .where(
            and(
                eq(profiles.profileCompleted, true),
                eq(profiles.isVisible, true),
                eq(profiles.discoveryPaused, false),
                eq(profiles.incognitoMode, false),
                isNull(user.deletedAt),
            ),
        );

    const eligibleUserIds = eligibleRows
        .filter((profile) => profile.waitlistStatus !== "waitlisted")
        .filter(hasCompletedInitialFaceVerification)
        .map((profile) => profile.userId);

    if (eligibleUserIds.length === 0) {
        return {
            ok: true,
            eligibleUsers: 0,
            skippedOnHold: 0,
            expiredPairs: 0,
            clearedShortlists: 0,
            regeneratedFor: 0,
            activeMatchesAfter: 0,
            releasedStaleHolds,
        };
    }

    const holdRows = await readDb
        .select({
            userAId: mutualMatches.userAId,
            userBId: mutualMatches.userBId,
        })
        .from(mutualMatches)
        .where(inArray(mutualMatches.status, [...SHUFFLE_HOLD_STATUSES]));
    const heldUserIds = new Set(holdRows.flatMap((row) => [row.userAId, row.userBId]));
    const shuffleUserIds = eligibleUserIds.filter((userId) => !heldUserIds.has(userId));

    if (shuffleUserIds.length === 0) {
        return {
            ok: true,
            eligibleUsers: eligibleUserIds.length,
            skippedOnHold: eligibleUserIds.length,
            expiredPairs: 0,
            clearedShortlists: 0,
            regeneratedFor: 0,
            activeMatchesAfter: 0,
            releasedStaleHolds,
        };
    }

    const { expiredPairs, clearedShortlists } = await db.transaction(async (tx) => {
        const pairFilters = [
            inArray(candidatePairs.status, ["active", "queued"] as const),
            or(
                inArray(candidatePairs.userAId, shuffleUserIds),
                inArray(candidatePairs.userBId, shuffleUserIds),
            ),
        ];

        const heldIds = [...heldUserIds];
        if (heldIds.length > 0) {
            pairFilters.push(notInArray(candidatePairs.userAId, heldIds));
            pairFilters.push(notInArray(candidatePairs.userBId, heldIds));
        }

        const pairsToExpire = await tx
            .select({
                id: candidatePairs.id,
                fromStatus: candidatePairs.status,
            })
            .from(candidatePairs)
            .where(and(...pairFilters));

        const expired = pairsToExpire.length > 0
            ? await tx
            .update(candidatePairs)
            .set({ status: "expired", updatedAt: now })
            .where(inArray(candidatePairs.id, pairsToExpire.map((pair) => pair.id)))
            .returning({ id: candidatePairs.id })
            : [];

        for (const pair of pairsToExpire) {
            await recordCandidatePairHistory(tx, {
                pairId: pair.id,
                actorUserId: session.user.id,
                eventType: "expired",
                fromStatus: pair.fromStatus,
                toStatus: "expired",
                metadata: {
                    source: "admin_daily_shuffle",
                    adminUserId: session.user.id,
                    reason: "daily_match_reshuffle",
                },
            });
        }

        const cleared = await tx
            .delete(dailyShortlists)
            .where(
                and(
                    inArray(dailyShortlists.viewerUserId, shuffleUserIds),
                    eq(dailyShortlists.shortlistDay, today),
                ),
            )
            .returning({ id: dailyShortlists.id });

        return {
            expiredPairs: expired.length,
            clearedShortlists: cleared.length,
        };
    });

    let regeneratedFor = 0;
    let activeMatchesAfter = 0;
    for (const userId of shuffleUserIds) {
        const matches = await generateCandidatePairsForUser(userId);
        if (matches.length > 0) {
            regeneratedFor++;
            activeMatchesAfter += matches.length;
        }
    }

    revalidatePath("/admin/matchmaking");
    return {
        ok: true,
        eligibleUsers: eligibleUserIds.length,
        skippedOnHold: eligibleUserIds.length - shuffleUserIds.length,
        expiredPairs,
        clearedShortlists,
        regeneratedFor,
        activeMatchesAfter,
        releasedStaleHolds,
    };
}

export async function getManualMatchmakingActivity() {
    await requireAdmin();
    const curatedPairIds = await getAdminCuratedPairIds();
    if (curatedPairIds.size === 0) return [];

    const pairs = await db
        .select()
        .from(candidatePairs)
        .where(
            and(
                inArray(candidatePairs.id, [...curatedPairIds]),
                inArray(candidatePairs.status, ["active", "queued", "mutual"]),
            ),
        )
        .orderBy(desc(candidatePairs.updatedAt))
        .limit(200);

    const userIds = [...new Set(pairs.flatMap((pair) => [pair.userAId, pair.userBId]))];
    const profileRows = userIds.length
        ? await db
            .select({
                userId: profiles.userId,
                firstName: profiles.firstName,
                lastName: profiles.lastName,
                fallbackName: user.name,
                email: user.email,
                userPhoneNumber: user.phoneNumber,
                profilePhoneNumber: profiles.phoneNumber,
            })
            .from(profiles)
            .innerJoin(user, eq(user.id, profiles.userId))
            .where(inArray(profiles.userId, userIds))
        : [];
    const nameByUserId = new Map(profileRows.map((row) => [row.userId, displayName(row, row.fallbackName)]));

    return pairs.map((pair) => ({
        pairId: pair.id,
        userAId: pair.userAId,
        userBId: pair.userBId,
        userAName: nameByUserId.get(pair.userAId) ?? pair.userAId,
        userBName: nameByUserId.get(pair.userBId) ?? pair.userBId,
        userAEmail: profileRows.find((row) => row.userId === pair.userAId)?.email ?? null,
        userBEmail: profileRows.find((row) => row.userId === pair.userBId)?.email ?? null,
        userAPhone: profileRows.find((row) => row.userId === pair.userAId)?.profilePhoneNumber ?? profileRows.find((row) => row.userId === pair.userAId)?.userPhoneNumber ?? null,
        userBPhone: profileRows.find((row) => row.userId === pair.userBId)?.profilePhoneNumber ?? profileRows.find((row) => row.userId === pair.userBId)?.userPhoneNumber ?? null,
        compatibilityScore: pair.compatibilityScore,
        reasons: pair.matchReasons,
        aDecision: pair.aDecision,
        bDecision: pair.bDecision,
        status: pair.status,
        expiresAt: pair.expiresAt.toISOString(),
        updatedAt: pair.updatedAt.toISOString(),
    }));
}
