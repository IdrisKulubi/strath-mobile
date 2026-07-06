import { and, eq, inArray, isNull, notInArray, or } from "drizzle-orm";

import db from "@/db/drizzle";
import {
    blocks,
    profiles,
    profileIntelligence,
    user,
    userMatchInterests,
} from "@/db/schema";
import { getTargetGenders, isReciprocalGenderMatch } from "@/lib/gender-preferences";
import { hasCompletedInitialFaceVerification } from "@/lib/matchmaking-pool-eligibility";
import {
    embedMatchmakerIntent,
    parseMatchmakerIntent,
    type MatchmakerParsedIntent,
} from "@/lib/services/matchmaker-intent-service";
import { recordMatchmakerIntent } from "@/lib/services/profile-intelligence-service";

export type MatchmakerSearchOptions = {
    viewerUserId: string;
    intentText: string;
    limit?: number;
    excludeUserIds?: string[];
};

export type MatchmakerCandidateInput = {
    candidateUserId: string;
    firstName?: string | null;
    age?: number | null;
    university?: string | null;
    course?: string | null;
    profilePhoto?: string | null;
    photos?: string[] | null;
    profileSummary?: string | null;
    searchText?: string | null;
    textEmbedding?: number[] | null;
    traitTags?: string[];
    datingIntentTags?: string[];
    socialEnergyTags?: string[];
    lifestyleTags?: string[];
    interestTags?: string[];
    communicationTags?: string[];
    availabilityTags?: string[];
    dealbreakerTags?: string[];
    activityScore: number;
    responseScore: number;
    inboundInterestScore: number;
    mutualConversionScore: number;
    candidateStrengthScore: number;
    profileCompletenessScore: number;
    photoPresentationScore: number;
    lastSeenAt?: Date | string | null;
};

export type RankedMatchmakerCandidate = {
    candidateUserId: string;
    firstName: string | null;
    age: number | null;
    university: string | null;
    course: string | null;
    profilePhoto: string | null;
    photos: string[];
    reason: string;
    labels: string[];
    internalScore: number;
};

function clampScore(value: number | null | undefined) {
    if (!Number.isFinite(value ?? NaN)) return 0;
    return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

function normalize(value: string | null | undefined) {
    return (value ?? "").toLowerCase();
}

function cosineSimilarity(left: number[] | null | undefined, right: number[] | null | undefined) {
    if (!left?.length || !right?.length || left.length !== right.length) return 0;
    let dot = 0;
    let leftNorm = 0;
    let rightNorm = 0;
    for (let index = 0; index < left.length; index += 1) {
        dot += left[index] * right[index];
        leftNorm += left[index] * left[index];
        rightNorm += right[index] * right[index];
    }
    if (leftNorm === 0 || rightNorm === 0) return 0;
    return Math.max(0, dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm)));
}

function keywordScore(intent: MatchmakerParsedIntent, candidate: MatchmakerCandidateInput) {
    const haystack = normalize([
        candidate.profileSummary,
        candidate.searchText,
        candidate.university,
        candidate.course,
    ].filter(Boolean).join(" "));
    if (!haystack || intent.keywords.length === 0) return 35;

    const matches = intent.keywords.filter((keyword) => haystack.includes(keyword));
    return clampScore((matches.length / Math.min(intent.keywords.length, 8)) * 100);
}

function normalizeTags(values: string[] | null | undefined) {
    return (values ?? []).map((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "")).filter(Boolean);
}

function structuredTagScore(intent: MatchmakerParsedIntent, candidate: MatchmakerCandidateInput) {
    const requestedTags = new Set([
        ...normalizeTags(intent.traits),
        ...normalizeTags(intent.keywords),
        ...(intent.seriousIntent ? ["serious", "intentional", "relationship"] : []),
        ...(intent.activeToday ? ["active_recently"] : []),
    ]);
    if (requestedTags.size === 0) return 35;

    const candidateTags = new Set([
        ...normalizeTags(candidate.traitTags),
        ...normalizeTags(candidate.datingIntentTags),
        ...normalizeTags(candidate.socialEnergyTags),
        ...normalizeTags(candidate.lifestyleTags),
        ...normalizeTags(candidate.interestTags),
        ...normalizeTags(candidate.communicationTags),
        ...normalizeTags(candidate.availabilityTags),
    ]);
    if (candidateTags.size === 0) return 35;

    let matches = 0;
    for (const tag of requestedTags) {
        if (candidateTags.has(tag)) matches += 1;
    }
    return clampScore((matches / Math.min(requestedTags.size, 8)) * 100);
}

function freshnessScore(candidate: MatchmakerCandidateInput) {
    const activityScore = clampScore(candidate.activityScore);
    if (!candidate.lastSeenAt) return activityScore;
    return activityScore;
}

function cleanPhotos(photos: string[] | null | undefined) {
    return (photos ?? []).filter((photo): photo is string => typeof photo === "string" && photo.trim().length > 0);
}

function primaryPhoto(candidate: MatchmakerCandidateInput) {
    const profilePhoto = typeof candidate.profilePhoto === "string" && candidate.profilePhoto.trim().length > 0
        ? candidate.profilePhoto
        : null;
    return profilePhoto ?? cleanPhotos(candidate.photos)[0] ?? null;
}

export function buildMatchmakerLabels(intent: MatchmakerParsedIntent, candidate: MatchmakerCandidateInput) {
    const labels = new Set<string>();
    if (candidate.activityScore >= 80) labels.add("Active today");
    else if (candidate.activityScore >= 60) labels.add("Recently active");

    if (candidate.responseScore >= 70) labels.add("Responsive");
    if (candidate.candidateStrengthScore >= 75) labels.add("Strong fit");
    if (candidate.profileCompletenessScore >= 80) labels.add("Complete profile");
    const datingIntentTags = normalizeTags(candidate.datingIntentTags);
    const traitTags = normalizeTags(candidate.traitTags);
    const availabilityTags = normalizeTags(candidate.availabilityTags);
    if (intent.seriousIntent && (datingIntentTags.some((tag) => ["serious", "intentional", "relationship"].includes(tag)) || normalize(candidate.searchText).match(/serious|intentional|relationship|long-term/))) {
        labels.add("Intentional");
    }
    if (intent.activeToday && availabilityTags.includes("active_recently")) labels.add("Active fit");
    if (intent.traits.includes("calm") && (traitTags.includes("calm") || normalize(candidate.searchText).match(/calm|chill|quiet|gentle|peaceful/))) {
        labels.add("Calm vibe");
    }

    return [...labels].slice(0, 3);
}

export function rankMatchmakerCandidates(input: {
    intent: MatchmakerParsedIntent;
    candidates: MatchmakerCandidateInput[];
    intentEmbedding?: number[] | null;
    limit?: number;
}) {
    const limit = Math.min(Math.max(input.limit ?? 3, 1), 10);
    return input.candidates
        .filter((candidate) => {
            if (input.intent.activeToday) return candidate.activityScore >= 45;
            return true;
        })
        .map((candidate) => {
            const lexical = keywordScore(input.intent, candidate);
            const structured = structuredTagScore(input.intent, candidate);
            const semantic = cosineSimilarity(input.intentEmbedding, candidate.textEmbedding) * 100;
            const textRelevance = lexical * 0.65 + structured * 0.35;
            const relevanceScore = input.intentEmbedding?.length
                ? semantic * 0.55 + textRelevance * 0.45
                : textRelevance;
            const score =
                relevanceScore * 0.34 +
                freshnessScore(candidate) * 0.2 +
                clampScore(candidate.responseScore) * 0.16 +
                clampScore(candidate.candidateStrengthScore) * 0.16 +
                clampScore(candidate.profileCompletenessScore) * 0.08 +
                clampScore(candidate.inboundInterestScore) * 0.04 +
                clampScore(candidate.photoPresentationScore) * 0.02;
            const labels = buildMatchmakerLabels(input.intent, candidate);
            const reason = labels.length > 0
                ? `${labels.join(", ")} and close to what you asked for.`
                : "Close to what you asked for.";

            return {
                candidateUserId: candidate.candidateUserId,
                firstName: candidate.firstName ?? null,
                age: candidate.age ?? null,
                university: candidate.university ?? null,
                course: candidate.course ?? null,
                profilePhoto: primaryPhoto(candidate),
                photos: cleanPhotos(candidate.photos),
                labels,
                reason,
                internalScore: clampScore(score),
            };
        })
        .sort((left, right) => right.internalScore - left.internalScore || left.candidateUserId.localeCompare(right.candidateUserId))
        .slice(0, limit);
}

async function getExcludedUserIds(viewerUserId: string, additional: string[]) {
    const [blockedRows, blockedByRows, passedRows] = await Promise.all([
        db.select({ id: blocks.blockedId }).from(blocks).where(eq(blocks.blockerId, viewerUserId)),
        db.select({ id: blocks.blockerId }).from(blocks).where(eq(blocks.blockedId, viewerUserId)),
        db
            .select({ id: userMatchInterests.candidateUserId })
            .from(userMatchInterests)
            .where(and(eq(userMatchInterests.viewerUserId, viewerUserId), eq(userMatchInterests.decision, "passed"))),
    ]);

    return [...new Set([
        viewerUserId,
        ...additional,
        ...blockedRows.map((row) => row.id),
        ...blockedByRows.map((row) => row.id),
        ...passedRows.map((row) => row.id),
    ])];
}

async function getCachedCandidates(viewerUserId: string, excludeUserIds: string[]) {
    const viewerProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, viewerUserId),
    });
    const targetGenders = viewerProfile
        ? getTargetGenders(viewerProfile.gender, viewerProfile.interestedIn as string[] | null)
        : [];

    const filters = [
        or(eq(profiles.profileCompleted, true), eq(profiles.isComplete, true)),
        or(eq(profiles.isVisible, true), isNull(profiles.isVisible)),
        or(eq(profiles.discoveryPaused, false), isNull(profiles.discoveryPaused)),
        or(eq(profiles.incognitoMode, false), isNull(profiles.incognitoMode)),
        eq(profiles.role, "user"),
        eq(user.role, "user"),
        isNull(user.deletedAt),
    ];

    if (excludeUserIds.length > 0) {
        filters.push(notInArray(profiles.userId, excludeUserIds));
    }
    if (targetGenders.length > 0) {
        filters.push(inArray(profiles.gender, targetGenders));
    }

    const rows = await db
        .select({ profile: profiles, intelligence: profileIntelligence })
        .from(profileIntelligence)
        .innerJoin(profiles, eq(profiles.userId, profileIntelligence.userId))
        .innerJoin(user, eq(user.id, profiles.userId))
        .where(and(...filters))
        .limit(200);

    return rows
        .filter((row) => hasCompletedInitialFaceVerification(row.profile))
        .filter((row) => isReciprocalGenderMatch(
            viewerProfile?.gender,
            row.profile.gender,
            row.profile.interestedIn as string[] | null,
        ))
        .map(({ profile, intelligence }) => ({
            candidateUserId: profile.userId,
            firstName: profile.firstName,
            age: profile.age,
            university: profile.university,
            course: profile.course,
            profilePhoto: profile.profilePhoto,
            photos: profile.photos,
            profileSummary: intelligence.profileSummary,
            searchText: intelligence.searchText,
            textEmbedding: intelligence.textEmbedding,
            traitTags: intelligence.traitTags,
            datingIntentTags: intelligence.datingIntentTags,
            socialEnergyTags: intelligence.socialEnergyTags,
            lifestyleTags: intelligence.lifestyleTags,
            interestTags: intelligence.interestTags,
            communicationTags: intelligence.communicationTags,
            availabilityTags: intelligence.availabilityTags,
            dealbreakerTags: intelligence.dealbreakerTags,
            activityScore: intelligence.activityScore,
            responseScore: intelligence.responseScore,
            inboundInterestScore: intelligence.inboundInterestScore,
            mutualConversionScore: intelligence.mutualConversionScore,
            candidateStrengthScore: intelligence.candidateStrengthScore,
            profileCompletenessScore: intelligence.profileCompletenessScore,
            photoPresentationScore: intelligence.photoPresentationScore,
            lastSeenAt: intelligence.lastSeenAt,
        }));
}

export async function searchMatchmakerCandidates(options: MatchmakerSearchOptions) {
    const intent = parseMatchmakerIntent(options.intentText);
    const limit = Math.min(Math.max(options.limit ?? 3, 1), 10);
    const [intentEmbedding, excludeUserIds] = await Promise.all([
        embedMatchmakerIntent(intent).catch((error) => {
            console.warn("[matchmaker-search] intent embedding failed", error);
            return null;
        }),
        getExcludedUserIds(options.viewerUserId, options.excludeUserIds ?? []),
    ]);
    const candidates = await getCachedCandidates(options.viewerUserId, excludeUserIds);
    const ranked = rankMatchmakerCandidates({ intent, candidates, intentEmbedding, limit });

    await recordMatchmakerIntent({
        userId: options.viewerUserId,
        rawText: options.intentText,
        parsedIntent: intent,
        intentEmbedding: intentEmbedding ?? undefined,
        metadata: {
            source: "matchmaker_search",
            resultCount: ranked.length,
            searchedCachedCandidates: candidates.length,
        },
    });

    return {
        summary: ranked.length > 0
            ? `I found ${ranked.length} ${ranked.length === 1 ? "person" : "people"} who fit that well.`
            : "I could not find a strong fit yet. Try broadening the request.",
        candidates: ranked.map(({ internalScore: _internalScore, ...candidate }) => candidate),
        intent: {
            traits: intent.traits,
            activeToday: intent.activeToday,
            seriousIntent: intent.seriousIntent,
        },
        meta: {
            searchedCachedCandidates: candidates.length,
            embeddingUsed: Boolean(intentEmbedding),
        },
    };
}
