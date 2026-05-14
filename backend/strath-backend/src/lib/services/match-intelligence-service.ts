import { and, asc, eq, gte, inArray, isNotNull, notInArray, or, sql } from "drizzle-orm";

import db from "@/db/drizzle";
import { db as readDb } from "@/lib/db";
import {
    blocks,
    candidatePairs,
    dailyShortlists,
    mutualMatches,
    profiles,
    recommendationEvents,
    user,
    userMatchInterests,
    userMatchPreferences,
    userMatchSignals,
} from "@/db/schema";
import { getTargetGenders, isReciprocalGenderMatch } from "@/lib/gender-preferences";
import { collectUsersIPassedIds } from "@/lib/matching/candidate-pool-policy";
import {
    canonicalizePairUsers,
    CANDIDATE_PAIR_EXPIRY_HOURS,
    getCurrentUserDecision,
    recordCandidatePairHistory,
    respondToCandidatePair,
} from "@/lib/services/candidate-pairs-service";
import { FACE_VERIFICATION_STATUSES } from "@/lib/services/face-verification-policy";
import { getActiveMatchHoldForUser, isUserOnMatchHold } from "@/lib/services/match-hold-service";
import { isAdminMatchPreviewUser, resolveMatchExcludedUserIds } from "@/lib/services/match-exclusion-service";
import { scoreProfilePair } from "@/lib/services/match-ranking";
import { sendPushNotification } from "@/lib/notifications";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";

export type PreferenceMode =
    | "similar_to_me"
    | "different_from_me"
    | "surprise_me"
    | "active_only"
    | "serious_matches";

export type MatchType =
    | "similarity"
    | "complementary"
    | "discovery"
    | "high_activity"
    | "admin_curated";

export type RecommendationSource =
    | "daily_recommendations"
    | "browse"
    | "admin_curated"
    | "available_now";

export type RecommendationDecision = "shown" | "viewed" | "open_to_meet" | "maybe" | "passed" | "ignored";
export type CurrentRecommendationDecision = "pending" | Exclude<RecommendationDecision, "shown" | "viewed" | "ignored">;

export type BrowseMode = "similar" | "different" | "new" | "available";

type ProfileRow = typeof profiles.$inferSelect;
type UserRow = typeof user.$inferSelect;
type PreferenceRow = typeof userMatchPreferences.$inferSelect;
type SignalRow = typeof userMatchSignals.$inferSelect;
type CandidateProfile = ProfileRow & { user?: UserRow | null };

export interface BrowseFilters {
    university?: string;
    course?: string;
    ageMin?: number;
    ageMax?: number;
    activeRecently?: boolean;
    verifiedOnly?: boolean;
    mode?: BrowseMode;
    limit?: number;
    cursor?: string;
}

export interface RankedRecommendation {
    candidateUserId: string;
    currentUserDecision: CurrentRecommendationDecision;
    finalScore: number;
    matchType: MatchType;
    compatibilityScore: number;
    activityScore: number;
    responseScore: number;
    availabilityScore: number;
    diversityScore: number;
    mutualProbabilityScore: number;
    preferenceFitScore: number;
    profileQualityScore: number;
    reason: string;
    reasons: string[];
    activityStatus: "active_now" | "active_today" | "active_recently" | "inactive";
    profilePreview: {
        firstName: string;
        age: number | null;
        university: string | null;
        course: string | null;
        photos: string[];
        profilePhoto?: string | null;
        bio?: string | null;
        interests: string[];
    };
}

export interface PreferenceInput {
    preferenceMode?: PreferenceMode;
    availableNow?: boolean;
    availableToday?: boolean;
    openToCalls?: boolean;
    preferredAgeMin?: number | null;
    preferredAgeMax?: number | null;
    preferredUniversities?: string[];
    preferredContactWindow?: string | null;
}

const DEFAULT_PREFERENCE_MODE: PreferenceMode = "surprise_me";
const DAILY_LIMIT = 5;
const MAX_BROWSE_LIMIT = 50;

function startOfUtcDay(date = new Date()) {
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function utcDayKey(date = new Date()) {
    return startOfUtcDay(date).toISOString().slice(0, 10);
}
function clampScore(value: number) {
    return Math.max(0, Math.min(100, Math.round(value)));
}

function normalize(value: string | null | undefined) {
    return (value ?? "").trim().toLowerCase();
}

function asStringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function unique<T>(values: T[]) {
    return [...new Set(values)];
}

function scoreActivityFromDate(lastActive: Date | string | null | undefined, now = new Date()) {
    if (!lastActive) return 35;
    const lastActiveAt = lastActive instanceof Date ? lastActive : new Date(lastActive);
    const minutes = (now.getTime() - lastActiveAt.getTime()) / 60000;
    if (minutes <= 10) return 100;
    if (minutes <= 60) return 92;
    if (minutes <= 24 * 60) return 82;
    if (minutes <= 3 * 24 * 60) return 66;
    if (minutes <= 7 * 24 * 60) return 45;
    return 20;
}

function activityStatusFromScore(score: number): RankedRecommendation["activityStatus"] {
    if (score >= 95) return "active_now";
    if (score >= 80) return "active_today";
    if (score >= 55) return "active_recently";
    return "inactive";
}

function scoreAvailability(preference: PreferenceRow | null | undefined) {
    if (!preference) return 45;
    let score = 45;
    if (preference.availableNow) score += 40;
    if (preference.availableToday) score += 20;
    if (preference.openToCalls) score += 8;
    return clampScore(score);
}

function scoreProfileQuality(profile: ProfileRow) {
    const photos = asStringArray(profile.photos);
    const interests = asStringArray(profile.interests);
    const prompts = Array.isArray(profile.prompts) ? profile.prompts.length : 0;
    const fields = [
        profile.profileCompleted || profile.isComplete,
        profile.profilePhoto || photos.length > 0,
        photos.length > 1,
        profile.bio || profile.aboutMe,
        interests.length > 0,
        profile.course,
        profile.university,
        prompts > 0,
        profile.faceVerificationStatus === FACE_VERIFICATION_STATUSES.VERIFIED || profile.faceVerifiedAt,
    ];
    return clampScore((fields.filter(Boolean).length / fields.length) * 100);
}

function scoreResponse(signal: SignalRow | null | undefined) {
    if (!signal) return 55;
    const base = signal.responseRate > 0 ? signal.responseRate : 55;
    return clampScore(base - signal.ghostingPenalty - Math.min(15, signal.noResponseCount * 3));
}

export function scoreDiversity(me: Pick<ProfileRow, "course" | "university" | "interests" | "personalityAnswers" | "lifestyleAnswers">, them: Pick<ProfileRow, "course" | "university" | "interests" | "personalityAnswers" | "lifestyleAnswers">) {
    let score = 25;
    if (me.course && them.course && normalize(me.course) !== normalize(them.course)) score += 25;
    if (me.university && them.university && normalize(me.university) !== normalize(them.university)) score += 15;

    const mine = new Set(asStringArray(me.interests).map(normalize).filter(Boolean));
    const theirs = new Set(asStringArray(them.interests).map(normalize).filter(Boolean));
    if (mine.size > 0 && theirs.size > 0) {
        const overlap = [...mine].filter((interest) => theirs.has(interest)).length;
        const overlapRatio = overlap / Math.min(mine.size, theirs.size);
        score += Math.round((1 - overlapRatio) * 25);
    }

    const myPersonality = me.personalityAnswers as Record<string, unknown> | null;
    const theirPersonality = them.personalityAnswers as Record<string, unknown> | null;
    if (myPersonality?.socialVibe && theirPersonality?.socialVibe && myPersonality.socialVibe !== theirPersonality.socialVibe) {
        score += 10;
    }

    return clampScore(score);
}

export function preferenceFitScore(input: {
    preferenceMode: PreferenceMode;
    compatibilityScore: number;
    activityScore: number;
    responseScore: number;
    diversityScore: number;
    availabilityScore: number;
}) {
    const { preferenceMode, compatibilityScore, activityScore, responseScore, diversityScore, availabilityScore } = input;
    switch (preferenceMode) {
        case "similar_to_me":
            return clampScore(compatibilityScore * 0.75 + activityScore * 0.15 + responseScore * 0.1);
        case "different_from_me":
            return clampScore(diversityScore * 0.65 + compatibilityScore * 0.2 + activityScore * 0.15);
        case "active_only":
            return clampScore(activityScore * 0.65 + responseScore * 0.25 + availabilityScore * 0.1);
        case "serious_matches":
            return clampScore(responseScore * 0.35 + availabilityScore * 0.25 + compatibilityScore * 0.25 + activityScore * 0.15);
        case "surprise_me":
        default:
            return clampScore(compatibilityScore * 0.35 + diversityScore * 0.25 + activityScore * 0.25 + responseScore * 0.15);
    }
}

export function classifyMatchType(input: {
    preferenceMode: PreferenceMode;
    compatibilityScore: number;
    activityScore: number;
    responseScore: number;
    diversityScore: number;
}): MatchType {
    if (input.preferenceMode === "active_only" || (input.activityScore >= 88 && input.responseScore >= 70)) {
        return "high_activity";
    }
    if (input.preferenceMode === "different_from_me" && input.diversityScore >= 65) {
        return "complementary";
    }
    if (input.diversityScore >= 78 && input.compatibilityScore >= 55) {
        return "discovery";
    }
    if (input.compatibilityScore >= 70) {
        return "similarity";
    }
    return input.diversityScore >= 60 ? "discovery" : "similarity";
}

export function finalRecommendationScore(input: {
    preferenceMode: PreferenceMode;
    compatibilityScore: number;
    activityScore: number;
    responseScore: number;
    availabilityScore: number;
    diversityScore: number;
    mutualProbabilityScore: number;
    preferenceFitScore: number;
    profileQualityScore: number;
    ghostingPenalty: number;
    passRiskPenalty: number;
    activeHoldPenalty: number;
}) {
    const weights =
        input.preferenceMode === "active_only"
            ? { compatibility: 0.1, activity: 0.35, response: 0.25, availability: 0.1, diversity: 0.05, mutual: 0.1, preference: 0.05, quality: 0.05 }
            : input.preferenceMode === "serious_matches"
                ? { compatibility: 0.2, activity: 0.15, response: 0.25, availability: 0.15, diversity: 0.05, mutual: 0.15, preference: 0.05, quality: 0.05 }
                : input.preferenceMode === "different_from_me"
                    ? { compatibility: 0.18, activity: 0.2, response: 0.18, availability: 0.08, diversity: 0.18, mutual: 0.1, preference: 0.08, quality: 0.05 }
                    : { compatibility: 0.25, activity: 0.22, response: 0.18, availability: 0.08, diversity: 0.08, mutual: 0.11, preference: 0.08, quality: 0.05 };

    const score =
        input.compatibilityScore * weights.compatibility +
        input.activityScore * weights.activity +
        input.responseScore * weights.response +
        input.availabilityScore * weights.availability +
        input.diversityScore * weights.diversity +
        input.mutualProbabilityScore * weights.mutual +
        input.preferenceFitScore * weights.preference +
        input.profileQualityScore * weights.quality -
        input.ghostingPenalty -
        input.passRiskPenalty -
        input.activeHoldPenalty;

    return clampScore(score);
}

function buildReason(matchType: MatchType, scores: { activityScore: number; compatibilityScore: number; diversityScore: number; profileQualityScore: number }, baseReasons: string[]) {
    const reasons = new Set<string>();
    if (matchType === "high_activity") reasons.add("Active today");
    if (matchType === "complementary") reasons.add("Different but interesting");
    if (matchType === "discovery") reasons.add("Something new");
    if (matchType === "similarity") reasons.add("Similar vibe");
    for (const reason of baseReasons) {
        if (reason && reasons.size < 3) reasons.add(reason);
    }
    if (scores.profileQualityScore >= 75 && reasons.size < 3) reasons.add("Complete profile");
    return [...reasons].slice(0, 3);
}

function toPreview(profile: CandidateProfile): RankedRecommendation["profilePreview"] {
    const photos = asStringArray(profile.photos);
    return {
        firstName: profile.firstName || profile.user?.name?.split(" ")[0] || "Unknown",
        age: profile.age ?? null,
        university: profile.university ?? null,
        course: profile.course ?? null,
        photos,
        profilePhoto: profile.profilePhoto ?? profile.user?.profilePhoto ?? profile.user?.image ?? photos[0] ?? null,
        bio: profile.bio ?? profile.aboutMe ?? null,
        interests: asStringArray(profile.interests).slice(0, 6),
    };
}

export async function getOrCreateMatchPreferences(userId: string): Promise<PreferenceRow> {
    const existing = await readDb.query.userMatchPreferences.findFirst({
        where: eq(userMatchPreferences.userId, userId),
    });
    if (existing) return existing;

    const [created] = await db
        .insert(userMatchPreferences)
        .values({ userId })
        .onConflictDoUpdate({
            target: userMatchPreferences.userId,
            set: { updatedAt: new Date() },
        })
        .returning();
    return created;
}

export async function updateMatchPreferences(userId: string, input: PreferenceInput) {
    const next = {
        ...(input.preferenceMode ? { preferenceMode: input.preferenceMode } : {}),
        ...(typeof input.availableNow === "boolean" ? { availableNow: input.availableNow } : {}),
        ...(typeof input.availableToday === "boolean" ? { availableToday: input.availableToday } : {}),
        ...(typeof input.openToCalls === "boolean" ? { openToCalls: input.openToCalls } : {}),
        ...(input.preferredAgeMin !== undefined ? { preferredAgeMin: input.preferredAgeMin } : {}),
        ...(input.preferredAgeMax !== undefined ? { preferredAgeMax: input.preferredAgeMax } : {}),
        ...(input.preferredUniversities ? { preferredUniversities: input.preferredUniversities } : {}),
        ...(input.preferredContactWindow !== undefined ? { preferredContactWindow: input.preferredContactWindow } : {}),
        updatedAt: new Date(),
    };

    const [updated] = await db
        .insert(userMatchPreferences)
        .values({ userId, ...next })
        .onConflictDoUpdate({
            target: userMatchPreferences.userId,
            set: next,
        })
        .returning();
    return updated;
}

export async function upsertActiveSignal(userId: string, lastActiveAt = new Date()) {
    const activeScore = scoreActivityFromDate(lastActiveAt);
    await db
        .insert(userMatchSignals)
        .values({ userId, lastActiveAt, activeScore, updatedAt: new Date() })
        .onConflictDoUpdate({
            target: userMatchSignals.userId,
            set: { lastActiveAt, activeScore, updatedAt: new Date() },
        });
}

async function getBlockedUserIds(userId: string) {
    const [blockedRows, blockedByRows] = await Promise.all([
        readDb.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, userId)),
        readDb.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, userId)),
    ]);
    return new Set([...blockedRows.map((row) => row.id), ...blockedByRows.map((row) => row.id)]);
}

async function getUsersIPassedIds(userId: string) {
    const [pairRows, interestRows] = await Promise.all([
        readDb
            .select({
                userAId: candidatePairs.userAId,
                userBId: candidatePairs.userBId,
                aDecision: candidatePairs.aDecision,
                bDecision: candidatePairs.bDecision,
            })
            .from(candidatePairs)
            .where(
                and(
                    eq(candidatePairs.status, "closed"),
                    or(
                        and(eq(candidatePairs.userAId, userId), eq(candidatePairs.aDecision, "passed")),
                        and(eq(candidatePairs.userBId, userId), eq(candidatePairs.bDecision, "passed")),
                    ),
                ),
            ),
        readDb
            .select({ candidateUserId: userMatchInterests.candidateUserId })
            .from(userMatchInterests)
            .where(and(eq(userMatchInterests.viewerUserId, userId), eq(userMatchInterests.decision, "passed"))),
    ]);
    return new Set([
        ...collectUsersIPassedIds(userId, pairRows),
        ...interestRows.map((row) => row.candidateUserId),
    ]);
}

async function getExistingDyadIds(userId: string) {
    const rows = await readDb
        .select({
            userAId: candidatePairs.userAId,
            userBId: candidatePairs.userBId,
            status: candidatePairs.status,
        })
        .from(candidatePairs)
        .where(
            and(
                inArray(candidatePairs.status, ["mutual"]),
                or(eq(candidatePairs.userAId, userId), eq(candidatePairs.userBId, userId)),
            ),
        );
    return new Set(rows.map((row) => (row.userAId === userId ? row.userBId : row.userAId)));
}

async function getRecentExposureCounts(viewerUserId: string) {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await readDb
        .select({
            candidateUserId: recommendationEvents.candidateUserId,
            count: sql<number>`count(*)::int`,
        })
        .from(recommendationEvents)
        .where(and(eq(recommendationEvents.viewerUserId, viewerUserId), gte(recommendationEvents.shownAt, since)))
        .groupBy(recommendationEvents.candidateUserId);
    return new Map(rows.map((row) => [row.candidateUserId, row.count]));
}

async function getCandidatePreferences(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, PreferenceRow>();
    const rows = await readDb
        .select()
        .from(userMatchPreferences)
        .where(inArray(userMatchPreferences.userId, userIds));
    return new Map(rows.map((row) => [row.userId, row]));
}

async function getCandidateSignals(userIds: string[]) {
    if (userIds.length === 0) return new Map<string, SignalRow>();
    const rows = await readDb
        .select()
        .from(userMatchSignals)
        .where(inArray(userMatchSignals.userId, userIds));
    return new Map(rows.map((row) => [row.userId, row]));
}

async function getIncomingOpenInterestMap(viewerUserId: string, candidateUserIds: string[]) {
    if (candidateUserIds.length === 0) return new Map<string, Date>();
    const rows = await readDb
        .select({
            viewerUserId: userMatchInterests.viewerUserId,
            decidedAt: userMatchInterests.decidedAt,
        })
        .from(userMatchInterests)
        .where(
            and(
                inArray(userMatchInterests.viewerUserId, candidateUserIds),
                eq(userMatchInterests.candidateUserId, viewerUserId),
                eq(userMatchInterests.decision, "open_to_meet"),
                sql`${userMatchInterests.matchedCandidatePairId} is null`,
            ),
        );
    return new Map(rows.map((row) => [row.viewerUserId, row.decidedAt]));
}

async function getViewerDecisionMap(viewerUserId: string, candidateUserIds: string[]) {
    if (candidateUserIds.length === 0) return new Map<string, CurrentRecommendationDecision>();
    const rows = await readDb
        .select({
            candidateUserId: userMatchInterests.candidateUserId,
            decision: userMatchInterests.decision,
        })
        .from(userMatchInterests)
        .where(
            and(
                eq(userMatchInterests.viewerUserId, viewerUserId),
                inArray(userMatchInterests.candidateUserId, candidateUserIds),
            ),
        );
    return new Map(rows.map((row) => [row.candidateUserId, row.decision]));
}

async function getEligibleCandidateProfiles(viewerUserId: string, filters: BrowseFilters = {}) {
    const viewerProfile = await readDb.query.profiles.findFirst({
        where: eq(profiles.userId, viewerUserId),
    });
    if (!viewerProfile) return { viewerProfile: null, candidates: [] as CandidateProfile[] };

    const [poolExcludedIds, blockedIds, passedIds, existingDyads] = await Promise.all([
        resolveMatchExcludedUserIds(),
        getBlockedUserIds(viewerUserId),
        getUsersIPassedIds(viewerUserId),
        getExistingDyadIds(viewerUserId),
    ]);
    const allowAdminPreview = poolExcludedIds.has(viewerUserId) && await isAdminMatchPreviewUser(viewerUserId);
    if (poolExcludedIds.has(viewerUserId) && !allowAdminPreview) {
        console.log("[match-intelligence] viewer excluded from discovery pool", {
            viewerUserId,
            reason: "admin_or_staff_pool_exclusion",
        });
        return { viewerProfile, candidates: [] as CandidateProfile[] };
    }

    const excludedIds = unique([
        viewerUserId,
        ...poolExcludedIds,
        ...blockedIds,
        ...passedIds,
        ...existingDyads,
    ]);

    const targetGenders = getTargetGenders(viewerProfile.gender, viewerProfile.interestedIn as string[] | null);

    const candidates = await readDb.query.profiles.findMany({
        where: and(
            notInArray(profiles.userId, excludedIds),
            eq(profiles.isVisible, true),
            eq(profiles.profileCompleted, true),
            eq(profiles.discoveryPaused, false),
            eq(profiles.incognitoMode, false),
            filters.university ? eq(profiles.university, filters.university) : undefined,
            filters.course ? eq(profiles.course, filters.course) : undefined,
            filters.ageMin ? gte(profiles.age, filters.ageMin) : undefined,
            filters.ageMax ? sql`${profiles.age} <= ${filters.ageMax}` : undefined,
            filters.verifiedOnly
                ? or(eq(profiles.faceVerificationStatus, FACE_VERIFICATION_STATUSES.VERIFIED), isNotNull(profiles.faceVerifiedAt))
                : or(
                    eq(profiles.faceVerificationStatus, FACE_VERIFICATION_STATUSES.VERIFIED),
                    isNotNull(profiles.faceVerifiedAt),
                    eq(profiles.waitlistStatus, "admitted"),
                ),
            targetGenders.length > 0 ? inArray(profiles.gender, targetGenders) : undefined,
        ),
        with: { user: true },
        limit: 250,
    });

    const now = new Date();
    const eligibleCandidates = candidates
        .filter((candidate) => !candidate.user?.deletedAt)
        .filter((candidate) => isReciprocalGenderMatch(viewerProfile.gender, candidate.gender, candidate.interestedIn as string[] | null))
        .filter((candidate) => !filters.activeRecently || scoreActivityFromDate(candidate.user?.lastActive ?? candidate.lastActive, now) >= 55);

    console.log("[match-intelligence] eligible pool", {
        viewerUserId,
        allowAdminPreview,
        viewerGender: viewerProfile.gender,
        interestedIn: viewerProfile.interestedIn,
        targetGenders: targetGenders.length > 0 ? targetGenders : "any",
        poolExcludedContainsViewer: poolExcludedIds.has(viewerUserId),
        poolExcludedCount: poolExcludedIds.size,
        blockedCount: blockedIds.size,
        passedCount: passedIds.size,
        existingDyadsCount: existingDyads.size,
        excludedIdsCount: excludedIds.length,
        rawCandidateCount: candidates.length,
        eligibleCandidateCount: eligibleCandidates.length,
        filters,
    });

    return {
        viewerProfile,
        candidates: eligibleCandidates,
    };
}

async function rankCandidates(viewerUserId: string, filters: BrowseFilters = {}) {
    const preference = await getOrCreateMatchPreferences(viewerUserId);
    await upsertActiveSignal(viewerUserId);

    const { viewerProfile, candidates } = await getEligibleCandidateProfiles(viewerUserId, filters);
    if (!viewerProfile || candidates.length === 0) {
        console.log("[match-intelligence] no candidates to rank", {
            viewerUserId,
            hasViewerProfile: Boolean(viewerProfile),
            candidateCount: candidates.length,
        });
        return [];
    }

    const candidateUserIds = candidates.map((candidate) => candidate.userId);
    const [candidatePreferences, candidateSignals, exposureCounts, holdEntries, incomingInterestMap, viewerDecisionMap] = await Promise.all([
        getCandidatePreferences(candidateUserIds),
        getCandidateSignals(candidateUserIds),
        getRecentExposureCounts(viewerUserId),
        Promise.all(candidateUserIds.map(async (candidateUserId) => [candidateUserId, await isUserOnMatchHold(candidateUserId)] as const)),
        getIncomingOpenInterestMap(viewerUserId, candidateUserIds),
        getViewerDecisionMap(viewerUserId, candidateUserIds),
    ]);
    const usersOnHold = new Set(holdEntries.filter(([, onHold]) => onHold).map(([candidateUserId]) => candidateUserId));

    const modePreference: PreferenceMode =
        filters.mode === "different"
            ? "different_from_me"
            : filters.mode === "available"
                ? "active_only"
                : filters.mode === "similar"
                    ? "similar_to_me"
                    : preference.preferenceMode ?? DEFAULT_PREFERENCE_MODE;

    console.log("[match-intelligence] ranking start", {
        viewerUserId,
        candidateCount: candidates.length,
        usersOnHoldCount: usersOnHold.size,
        incomingOpenInterestCount: incomingInterestMap.size,
        existingDecisionCount: viewerDecisionMap.size,
        preferenceMode: preference.preferenceMode ?? DEFAULT_PREFERENCE_MODE,
        modePreference,
    });

    const ranked = candidates.map((candidate) => {
        const compatibility = scoreProfilePair(viewerProfile, candidate);
        const candidatePreference = candidatePreferences.get(candidate.userId);
        const candidateSignal = candidateSignals.get(candidate.userId);
        const compatibilityScore = compatibility.score;
        const activityScore = scoreActivityFromDate(candidate.user?.lastActive ?? candidate.lastActive);
        const responseScore = scoreResponse(candidateSignal);
        const availabilityScore = scoreAvailability(candidatePreference);
        const diversityScore = scoreDiversity(viewerProfile, candidate);
        const profileQualityScore = scoreProfileQuality(candidate);
        const hasIncomingOpenInterest = incomingInterestMap.has(candidate.userId);
        const baseMutualProbabilityScore = clampScore((compatibilityScore * 0.45) + (responseScore * 0.3) + (activityScore * 0.15) + (availabilityScore * 0.1));
        const mutualProbabilityScore = hasIncomingOpenInterest ? 100 : baseMutualProbabilityScore;
        const preferenceFit = preferenceFitScore({
            preferenceMode: modePreference,
            compatibilityScore,
            activityScore,
            responseScore,
            diversityScore,
            availabilityScore,
        });
        const exposurePenalty = Math.min(20, (exposureCounts.get(candidate.userId) ?? 0) * 5);
        const passRiskPenalty = candidateSignal?.passRiskPenalty ?? 0;
        const ghostingPenalty = candidateSignal?.ghostingPenalty ?? 0;
        const activeHoldPenalty = usersOnHold.has(candidate.userId) ? 8 : 0;
        const matchType = classifyMatchType({
            preferenceMode: modePreference,
            compatibilityScore,
            activityScore,
            responseScore,
            diversityScore,
        });
        const baseFinalScore = finalRecommendationScore({
            preferenceMode: modePreference,
            compatibilityScore,
            activityScore,
            responseScore,
            availabilityScore,
            diversityScore,
            mutualProbabilityScore,
            preferenceFitScore: preferenceFit,
            profileQualityScore,
            ghostingPenalty,
            passRiskPenalty: passRiskPenalty + exposurePenalty,
            activeHoldPenalty,
        });
        const finalScore = hasIncomingOpenInterest
            ? clampScore(Math.max(96, baseFinalScore + 24))
            : baseFinalScore;
        const reasons = buildReason(matchType, { activityScore, compatibilityScore, diversityScore, profileQualityScore }, compatibility.reasons);
        console.log("[match-intelligence] scored candidate", {
            viewerUserId,
            candidateUserId: candidate.userId,
            firstName: candidate.firstName,
            matchType,
            finalScore,
            compatibilityScore,
            activityScore,
            responseScore,
            availabilityScore,
            diversityScore,
            mutualProbabilityScore,
            preferenceFitScore: preferenceFit,
            profileQualityScore,
            hasIncomingOpenInterest,
            incomingInterestAt: incomingInterestMap.get(candidate.userId)?.toISOString() ?? null,
            ghostingPenalty,
            passRiskPenalty,
            exposurePenalty,
            activeHoldPenalty,
            reasons,
        });

        return {
            candidateUserId: candidate.userId,
            currentUserDecision: viewerDecisionMap.get(candidate.userId) ?? "pending",
            finalScore,
            matchType,
            compatibilityScore,
            activityScore,
            responseScore,
            availabilityScore,
            diversityScore,
            mutualProbabilityScore,
            preferenceFitScore: preferenceFit,
            profileQualityScore,
            reason: reasons.join(", "),
            reasons,
            activityStatus: activityStatusFromScore(activityScore),
            profilePreview: toPreview(candidate),
        };
    });

    const sorted = ranked.sort((left, right) => right.finalScore - left.finalScore || right.activityScore - left.activityScore);
    console.log("[match-intelligence] ranking summary", {
        viewerUserId,
        rankedCount: sorted.length,
        top: sorted.slice(0, 10).map((item) => ({
            candidateUserId: item.candidateUserId,
            firstName: item.profilePreview.firstName,
            finalScore: item.finalScore,
            matchType: item.matchType,
            reason: item.reason,
        })),
    });
    return sorted;
}

function targetDailyMix(preferenceMode: PreferenceMode): MatchType[] {
    switch (preferenceMode) {
        case "similar_to_me":
            return ["similarity", "similarity", "similarity", "similarity", "high_activity"];
        case "different_from_me":
            return ["complementary", "complementary", "complementary", "discovery", "high_activity"];
        case "active_only":
            return ["high_activity", "high_activity", "high_activity", "high_activity", "high_activity"];
        case "serious_matches":
            return ["similarity", "similarity", "high_activity", "complementary", "discovery"];
        case "surprise_me":
        default:
            return ["similarity", "similarity", "complementary", "high_activity", "discovery"];
    }
}

function applyDailyMix(ranked: RankedRecommendation[], preferenceMode: PreferenceMode) {
    const selected: RankedRecommendation[] = [];
    const used = new Set<string>();
    for (const matchType of targetDailyMix(preferenceMode)) {
        const next = ranked.find((item) => item.matchType === matchType && !used.has(item.candidateUserId));
        if (!next) continue;
        selected.push(next);
        used.add(next.candidateUserId);
    }
    for (const item of ranked) {
        if (selected.length >= DAILY_LIMIT) break;
        if (used.has(item.candidateUserId)) continue;
        selected.push(item);
        used.add(item.candidateUserId);
    }
    return selected.slice(0, DAILY_LIMIT);
}

async function getTodaysStableDailyRecommendations(userId: string): Promise<RankedRecommendation[]> {
    const shortlistDay = utcDayKey();
    const rows = await readDb
        .select()
        .from(dailyShortlists)
        .where(
            and(
                eq(dailyShortlists.viewerUserId, userId),
                eq(dailyShortlists.shortlistDay, shortlistDay),
            ),
        )
        .orderBy(asc(dailyShortlists.position), asc(dailyShortlists.createdAt));

    const uniqueRows = rows;

    if (uniqueRows.length === 0) return [];

    const candidateUserIds = uniqueRows.map((row) => row.candidateUserId);
    const [viewerProfile, candidateProfiles, decisionMap] = await Promise.all([
        readDb.query.profiles.findFirst({ where: eq(profiles.userId, userId) }),
        readDb.query.profiles.findMany({
            where: inArray(profiles.userId, candidateUserIds),
            with: { user: true },
        }),
        getViewerDecisionMap(userId, candidateUserIds),
    ]);
    if (!viewerProfile) return [];

    const byUserId = new Map(candidateProfiles.map((profile) => [profile.userId, profile]));
    const stable = uniqueRows.flatMap((event) => {
        const candidate = byUserId.get(event.candidateUserId);
        if (!candidate || candidate.user?.deletedAt) return [];

        const compatibility = scoreProfilePair(viewerProfile, candidate);
        const matchType = event.matchType ?? classifyMatchType({
            preferenceMode: DEFAULT_PREFERENCE_MODE,
            compatibilityScore: event.compatibilityScore ?? compatibility.score,
            activityScore: event.activityScore ?? scoreActivityFromDate(candidate.user?.lastActive ?? candidate.lastActive),
            responseScore: event.responseScore ?? 55,
            diversityScore: event.diversityScore ?? scoreDiversity(viewerProfile, candidate),
        });
        const compatibilityScore = event.compatibilityScore ?? compatibility.score;
        const activityScore = event.activityScore ?? scoreActivityFromDate(candidate.user?.lastActive ?? candidate.lastActive);
        const responseScore = event.responseScore ?? 55;
        const diversityScore = event.diversityScore ?? scoreDiversity(viewerProfile, candidate);
        const profileQualityScore = scoreProfileQuality(candidate);
        const reasons = buildReason(matchType, { activityScore, compatibilityScore, diversityScore, profileQualityScore }, compatibility.reasons);

        return [{
            candidateUserId: candidate.userId,
            currentUserDecision: decisionMap.get(candidate.userId) ?? "pending",
            finalScore: event.finalScore ?? compatibilityScore,
            matchType,
            compatibilityScore,
            activityScore,
            responseScore,
            availabilityScore: 0,
            diversityScore,
            mutualProbabilityScore: event.mutualProbabilityScore ?? compatibilityScore,
            preferenceFitScore: event.finalScore ?? compatibilityScore,
            profileQualityScore,
            reason: reasons.join(", "),
            reasons,
            activityStatus: activityStatusFromScore(activityScore),
            profilePreview: toPreview(candidate),
        }];
    }).slice(0, DAILY_LIMIT);

    console.log("[match-intelligence] reusing stable daily shortlist", {
        userId,
        shortlistDay,
        rowCount: rows.length,
        reusedCount: stable.length,
        candidates: stable.map((item) => ({
            candidateUserId: item.candidateUserId,
            firstName: item.profilePreview.firstName,
            finalScore: item.finalScore,
            matchType: item.matchType,
        })),
    });

    return stable;
}

async function getDailyShortlistRowCount(viewerUserId: string, shortlistDay: string) {
    const [row] = await readDb
        .select({ count: sql<number>`count(*)::int` })
        .from(dailyShortlists)
        .where(
            and(
                eq(dailyShortlists.viewerUserId, viewerUserId),
                eq(dailyShortlists.shortlistDay, shortlistDay),
            ),
        );
    return row?.count ?? 0;
}

async function persistDailyShortlistEntries(input: {
    viewerUserId: string;
    shortlistDay: string;
    startPosition: number;
    recommendations: RankedRecommendation[];
    metadata?: Record<string, unknown>;
}) {
    if (input.recommendations.length === 0) return [];

    return db
        .insert(dailyShortlists)
        .values(
            input.recommendations.map((item, index) => ({
                viewerUserId: input.viewerUserId,
                candidateUserId: item.candidateUserId,
                shortlistDay: input.shortlistDay,
                position: input.startPosition + index,
                matchType: item.matchType,
                finalScore: item.finalScore,
                compatibilityScore: item.compatibilityScore,
                activityScore: item.activityScore,
                responseScore: item.responseScore,
                diversityScore: item.diversityScore,
                mutualProbabilityScore: item.mutualProbabilityScore,
                metadata: input.metadata ?? {},
            })),
        )
        .onConflictDoNothing()
        .returning();
}

export async function getDailyRecommendations(userId: string) {
    const preference = await getOrCreateMatchPreferences(userId);
    const hold = await getActiveMatchHoldForUser(userId);

    const stableRecommendations = await getTodaysStableDailyRecommendations(userId);
    if (stableRecommendations.length >= DAILY_LIMIT) {
        return {
            userId,
            generatedAt: new Date().toISOString(),
            preferenceMode: preference.preferenceMode ?? DEFAULT_PREFERENCE_MODE,
            mode: "recommendations" as const,
            hold,
            recommendations: stableRecommendations,
        };
    }

    const ranked = await rankCandidates(userId);
    const stableIds = new Set(stableRecommendations.map((item) => item.candidateUserId));
    const remainingSlots = Math.max(DAILY_LIMIT - stableRecommendations.length, 0);
    const nextRecommendations = applyDailyMix(
        ranked.filter((item) => !stableIds.has(item.candidateUserId)),
        preference.preferenceMode ?? DEFAULT_PREFERENCE_MODE,
    ).slice(0, remainingSlots);
    const recommendations = [...stableRecommendations, ...nextRecommendations].slice(0, DAILY_LIMIT);
    console.log("[match-intelligence] daily mix", {
        userId,
        preferenceMode: preference.preferenceMode ?? DEFAULT_PREFERENCE_MODE,
        rankedCount: ranked.length,
        selectedCount: recommendations.length,
        selected: recommendations.map((item) => ({
            candidateUserId: item.candidateUserId,
            firstName: item.profilePreview.firstName,
            finalScore: item.finalScore,
            matchType: item.matchType,
            reason: item.reason,
        })),
    });
    const shortlistDay = utcDayKey();
    const nextPosition = await getDailyShortlistRowCount(userId, shortlistDay);
    await persistDailyShortlistEntries({
        viewerUserId: userId,
        shortlistDay,
        startPosition: nextPosition,
        recommendations: nextRecommendations,
    });
    await logShownRecommendations(userId, "daily_recommendations", nextRecommendations);
    const persistedRecommendations = await getTodaysStableDailyRecommendations(userId);

    return {
        userId,
        generatedAt: new Date().toISOString(),
        preferenceMode: preference.preferenceMode ?? DEFAULT_PREFERENCE_MODE,
        mode: "recommendations" as const,
        hold,
        recommendations: persistedRecommendations.length > 0 ? persistedRecommendations : recommendations,
    };
}

export async function getBrowseRecommendations(userId: string, filters: BrowseFilters = {}) {
    const limit = Math.min(Math.max(filters.limit ?? 20, 1), MAX_BROWSE_LIMIT);
    const ranked = await rankCandidates(userId, filters);
    const offset = filters.cursor ? Math.max(Number(filters.cursor) || 0, 0) : 0;
    const results = ranked.slice(offset, offset + limit);
    await logShownRecommendations(userId, "browse", results, { filters });
    return {
        userId,
        mode: filters.mode ?? "similar",
        results,
        nextCursor: offset + results.length < ranked.length ? String(offset + results.length) : null,
    };
}

export async function logShownRecommendations(
    viewerUserId: string,
    source: RecommendationSource,
    recommendations: RankedRecommendation[],
    metadata: Record<string, unknown> = {},
) {
    if (recommendations.length === 0) return;
    await db.insert(recommendationEvents).values(
        recommendations.map((item) => ({
            viewerUserId,
            candidateUserId: item.candidateUserId,
            source,
            matchType: item.matchType,
            finalScore: item.finalScore,
            compatibilityScore: item.compatibilityScore,
            activityScore: item.activityScore,
            responseScore: item.responseScore,
            diversityScore: item.diversityScore,
            mutualProbabilityScore: item.mutualProbabilityScore,
            decision: "shown" as const,
            metadata,
        })),
    );
}

export async function recordRecommendationEvent(input: {
    viewerUserId: string;
    candidateUserId: string;
    source: RecommendationSource;
    matchType?: MatchType;
    event: RecommendationDecision;
    finalScore?: number;
    compatibilityScore?: number;
    activityScore?: number;
    responseScore?: number;
    diversityScore?: number;
    mutualProbabilityScore?: number;
    metadata?: Record<string, unknown>;
}) {
    const now = new Date();
    const [event] = await db
        .insert(recommendationEvents)
        .values({
            viewerUserId: input.viewerUserId,
            candidateUserId: input.candidateUserId,
            source: input.source,
            matchType: input.matchType,
            finalScore: input.finalScore,
            compatibilityScore: input.compatibilityScore,
            activityScore: input.activityScore,
            responseScore: input.responseScore,
            diversityScore: input.diversityScore,
            mutualProbabilityScore: input.mutualProbabilityScore,
            decision: input.event,
            viewedAt: input.event === "viewed" ? now : null,
            decidedAt: ["open_to_meet", "maybe", "passed", "ignored"].includes(input.event) ? now : null,
            metadata: input.metadata ?? {},
        })
        .returning();
    return event;
}

async function updateSignalsAfterDecision(userId: string, decision: Exclude<RecommendationDecision, "shown" | "viewed" | "ignored">) {
    const existing = await readDb.query.userMatchSignals.findFirst({
        where: eq(userMatchSignals.userId, userId),
    });
    const openToMeetCount = (existing?.openToMeetCount ?? 0) + (decision === "open_to_meet" ? 1 : 0);
    const maybeCount = (existing?.maybeCount ?? 0) + (decision === "maybe" ? 1 : 0);
    const passCount = (existing?.passCount ?? 0) + (decision === "passed" ? 1 : 0);
    const total = openToMeetCount + maybeCount + passCount;
    const responseRate = total > 0 ? clampScore(((openToMeetCount + maybeCount) / total) * 100) : existing?.responseRate ?? 0;
    const passRiskPenalty = total >= 5 ? clampScore((passCount / total) * 35) : existing?.passRiskPenalty ?? 0;

    await db
        .insert(userMatchSignals)
        .values({
            userId,
            openToMeetCount,
            maybeCount,
            passCount,
            responseRate,
            passRiskPenalty,
            updatedAt: new Date(),
        })
        .onConflictDoUpdate({
            target: userMatchSignals.userId,
            set: {
                openToMeetCount,
                maybeCount,
                passCount,
                responseRate,
                passRiskPenalty,
                updatedAt: new Date(),
            },
        });
}

async function upsertDirectedInterest(input: {
    eventId: string;
    viewerUserId: string;
    candidateUserId: string;
    decision: Exclude<RecommendationDecision, "shown" | "viewed" | "ignored">;
    source: RecommendationSource;
    matchType?: MatchType;
}) {
    const now = new Date();
    const [interest] = await db
        .insert(userMatchInterests)
        .values({
            viewerUserId: input.viewerUserId,
            candidateUserId: input.candidateUserId,
            decision: input.decision,
            source: input.source,
            matchType: input.matchType,
            lastRecommendationEventId: input.eventId,
            decidedAt: now,
            updatedAt: now,
        })
        .onConflictDoUpdate({
            target: [userMatchInterests.viewerUserId, userMatchInterests.candidateUserId],
            set: {
                decision: input.decision,
                source: input.source,
                matchType: input.matchType,
                lastRecommendationEventId: input.eventId,
                decidedAt: now,
                updatedAt: now,
            },
        })
        .returning();
    return interest;
}

async function notifyReciprocalMatch(input: {
    pairId: string;
    userAId: string;
    userBId: string;
}) {
    const [userA, userB, profileA, profileB] = await Promise.all([
        readDb.query.user.findFirst({ where: eq(user.id, input.userAId) }),
        readDb.query.user.findFirst({ where: eq(user.id, input.userBId) }),
        readDb.query.profiles.findFirst({ where: eq(profiles.userId, input.userAId) }),
        readDb.query.profiles.findFirst({ where: eq(profiles.userId, input.userBId) }),
    ]);

    const nameA = profileA?.firstName || userA?.name?.split(" ")[0] || "Someone";
    const nameB = profileB?.firstName || userB?.name?.split(" ")[0] || "Someone";

    await Promise.all([
        userA?.pushToken
            ? sendPushNotification(userA.pushToken, {
                  title: "It's mutual",
                  body: `You and ${nameB} are both interested`,
                  data: {
                      type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                      pairId: input.pairId,
                      userId: input.userBId,
                  },
              })
            : Promise.resolve(),
        userB?.pushToken
            ? sendPushNotification(userB.pushToken, {
                  title: "It's mutual",
                  body: `You and ${nameA} are both interested`,
                  data: {
                      type: NOTIFICATION_TYPES.MUTUAL_MATCH,
                      pairId: input.pairId,
                      userId: input.userAId,
                  },
              })
            : Promise.resolve(),
    ]);
}

async function linkInterestRowsToPair(input: {
    pairId: string;
    eventId: string;
    viewerUserId: string;
    candidateUserId: string;
}) {
    await Promise.all([
        db
            .update(recommendationEvents)
            .set({ createdCandidatePairId: input.pairId })
            .where(eq(recommendationEvents.id, input.eventId)),
        db
            .update(userMatchInterests)
            .set({ matchedCandidatePairId: input.pairId, updatedAt: new Date() })
            .where(
                or(
                    and(
                        eq(userMatchInterests.viewerUserId, input.viewerUserId),
                        eq(userMatchInterests.candidateUserId, input.candidateUserId),
                    ),
                    and(
                        eq(userMatchInterests.viewerUserId, input.candidateUserId),
                        eq(userMatchInterests.candidateUserId, input.viewerUserId),
                    ),
                ),
            ),
    ]);
}

async function createPairFromReciprocalInterest(input: {
    viewerUserId: string;
    candidateUserId: string;
    eventId: string;
    source: RecommendationSource;
    matchType?: MatchType;
    reverseDecidedAt?: Date | null;
}) {
    const now = new Date();
    const { userAId, userBId } = canonicalizePairUsers(input.viewerUserId, input.candidateUserId);
    const existing = await readDb.query.candidatePairs.findFirst({
        where: and(
            eq(candidatePairs.userAId, userAId),
            eq(candidatePairs.userBId, userBId),
            or(
                eq(candidatePairs.status, "mutual"),
                eq(candidatePairs.status, "queued"),
                and(eq(candidatePairs.status, "active"), gte(candidatePairs.expiresAt, now)),
            ),
        ),
    });

    if (existing) {
        const currentDecision = getCurrentUserDecision(existing, input.viewerUserId);
        if (existing.status === "active" && currentDecision === "pending") {
            const result = await respondToCandidatePair(existing.id, input.viewerUserId, "open_to_meet", {
                allowConcurrentInterest: true,
            });
            await linkInterestRowsToPair({
                pairId: result.pair.id,
                eventId: input.eventId,
                viewerUserId: input.viewerUserId,
                candidateUserId: input.candidateUserId,
            });
            if (result.mutual) {
                await notifyReciprocalMatch({
                    pairId: result.pair.id,
                    userAId: result.mutual.userAId,
                    userBId: result.mutual.userBId,
                });
            }
            return result;
        }

        await linkInterestRowsToPair({
            pairId: existing.id,
            eventId: input.eventId,
            viewerUserId: input.viewerUserId,
            candidateUserId: input.candidateUserId,
        });
        const mutual = await readDb.query.mutualMatches.findFirst({
            where: eq(mutualMatches.candidatePairId, existing.id),
        });
        return { pair: existing, mutual };
    }

    const [viewerProfile, candidateProfile] = await Promise.all([
        readDb.query.profiles.findFirst({ where: eq(profiles.userId, input.viewerUserId) }),
        readDb.query.profiles.findFirst({ where: eq(profiles.userId, input.candidateUserId) }),
    ]);
    if (!viewerProfile || !candidateProfile) {
        throw new Error("Profile not found");
    }

    const compatibility = scoreProfilePair(viewerProfile, candidateProfile);
    const expiresAt = new Date(now.getTime() + CANDIDATE_PAIR_EXPIRY_HOURS * 60 * 60 * 1000);
    const reverseUserId = input.candidateUserId;
    const aDecision = userAId === reverseUserId ? "open_to_meet" : "pending";
    const bDecision = userBId === reverseUserId ? "open_to_meet" : "pending";
    const shownToAAt = userAId === reverseUserId ? input.reverseDecidedAt ?? now : now;
    const shownToBAt = userBId === reverseUserId ? input.reverseDecidedAt ?? now : now;

    const pair = await db.transaction(async (tx) => {
        const [created] = await tx
            .insert(candidatePairs)
            .values({
                userAId,
                userBId,
                compatibilityScore: compatibility.score,
                matchReasons: compatibility.reasons,
                shownToAAt,
                shownToBAt,
                expiresAt,
                status: "active",
                aDecision,
                bDecision,
            })
            .returning();

        await recordCandidatePairHistory(tx, {
            pairId: created.id,
            actorUserId: input.viewerUserId,
            eventType: "generated",
            toStatus: "active",
            metadata: {
                source: input.source,
                recommendationEventId: input.eventId,
                reciprocal: true,
                matchType: input.matchType,
            },
        });

        return created;
    });

    const result = await respondToCandidatePair(pair.id, input.viewerUserId, "open_to_meet", {
        allowConcurrentInterest: true,
    });
    await linkInterestRowsToPair({
        pairId: result.pair.id,
        eventId: input.eventId,
        viewerUserId: input.viewerUserId,
        candidateUserId: input.candidateUserId,
    });
    if (result.mutual) {
        await notifyReciprocalMatch({
            pairId: result.pair.id,
            userAId: result.mutual.userAId,
            userBId: result.mutual.userBId,
        });
    }
    return result;
}

export async function handleRecommendationDecision(input: {
    viewerUserId: string;
    candidateUserId: string;
    decision: Exclude<RecommendationDecision, "shown" | "viewed" | "ignored">;
    source: RecommendationSource;
    matchType?: MatchType;
}) {
    if (input.viewerUserId === input.candidateUserId) {
        throw new Error("Cannot decide on your own profile");
    }

    console.log("[match-intelligence] recommendation decision received", {
        viewerUserId: input.viewerUserId,
        candidateUserId: input.candidateUserId,
        decision: input.decision,
        source: input.source,
        matchType: input.matchType,
    });

    const event = await recordRecommendationEvent({
        viewerUserId: input.viewerUserId,
        candidateUserId: input.candidateUserId,
        source: input.source,
        matchType: input.matchType,
        event: input.decision,
    });

    await updateSignalsAfterDecision(input.viewerUserId, input.decision);
    const interest = await upsertDirectedInterest({
        eventId: event.id,
        viewerUserId: input.viewerUserId,
        candidateUserId: input.candidateUserId,
        decision: input.decision,
        source: input.source,
        matchType: input.matchType,
    });

    console.log("[match-intelligence] directed interest updated", {
        eventId: event.id,
        interestId: interest.id,
        viewerUserId: interest.viewerUserId,
        candidateUserId: interest.candidateUserId,
        decision: interest.decision,
    });

    if (input.decision !== "open_to_meet") {
        console.log("[match-intelligence] no pair created for non-interest decision", {
            eventId: event.id,
            decision: input.decision,
        });
        return { event, interest, pair: null, mutual: null, mutualMatchCreated: false };
    }

    const reverseInterest = await readDb.query.userMatchInterests.findFirst({
        where: and(
            eq(userMatchInterests.viewerUserId, input.candidateUserId),
            eq(userMatchInterests.candidateUserId, input.viewerUserId),
            eq(userMatchInterests.decision, "open_to_meet"),
        ),
    });

    console.log("[match-intelligence] reverse interest lookup", {
        eventId: event.id,
        viewerUserId: input.viewerUserId,
        candidateUserId: input.candidateUserId,
        foundReverseInterest: Boolean(reverseInterest),
        reverseInterestId: reverseInterest?.id ?? null,
        reverseMatchedCandidatePairId: reverseInterest?.matchedCandidatePairId ?? null,
    });

    if (reverseInterest?.matchedCandidatePairId) {
        const pair = await readDb.query.candidatePairs.findFirst({
            where: eq(candidatePairs.id, reverseInterest.matchedCandidatePairId),
        });
        const mutual = await readDb.query.mutualMatches.findFirst({
            where: eq(mutualMatches.candidatePairId, reverseInterest.matchedCandidatePairId),
        });
        await linkInterestRowsToPair({
            pairId: reverseInterest.matchedCandidatePairId,
            eventId: event.id,
            viewerUserId: input.viewerUserId,
            candidateUserId: input.candidateUserId,
        });
        return { event, interest, pair: pair ?? null, mutual: mutual ?? null, mutualMatchCreated: Boolean(mutual) };
    }

    if (!reverseInterest) {
        return { event, interest, pair: null, mutual: null, mutualMatchCreated: false };
    }

    const result = await createPairFromReciprocalInterest({
        viewerUserId: input.viewerUserId,
        candidateUserId: input.candidateUserId,
        eventId: event.id,
        source: input.source,
        matchType: input.matchType,
        reverseDecidedAt: reverseInterest.decidedAt,
    });

    console.log("[match-intelligence] reciprocal match resolution", {
        eventId: event.id,
        pairId: result.pair.id,
        mutualMatchId: result.mutual?.id ?? null,
        mutualMatchCreated: Boolean(result.mutual),
    });

    return {
        event,
        interest,
        pair: result.pair,
        mutual: result.mutual,
        mutualMatchCreated: Boolean(result.mutual),
    };
}
