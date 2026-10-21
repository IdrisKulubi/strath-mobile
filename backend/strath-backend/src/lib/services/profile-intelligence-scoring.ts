export type BehaviorSignalInput = {
    lastActiveAt?: Date | string | null;
    openToMeetCount?: number | null;
    passCount?: number | null;
    noResponseCount?: number | null;
    ghostingPenalty?: number | null;
    likesReceivedCount?: number | null;
    viewsReceivedCount?: number | null;
    recentLikesReceivedCount?: number | null;
    shownCount?: number | null;
    mutualMatchesCount?: number | null;
    profileCompletenessScore?: number | null;
    photoPresentationScore?: number | null;
    now?: Date;
};

export type BehaviorSignalScores = {
    activityScore: number;
    responseScore: number;
    inboundInterestScore: number;
    mutualConversionScore: number;
    candidateStrengthScore: number;
};

const CANDIDATE_STRENGTH_WEIGHTS = {
    activityScore: 0.3,
    responseScore: 0.25,
    inboundInterestScore: 0.15,
    mutualConversionScore: 0.15,
    profileCompletenessScore: 0.1,
    photoPresentationScore: 0.05,
} as const;

export function clampProfileIntelligenceScore(value: number | null | undefined) {
    if (!Number.isFinite(value ?? NaN)) return 0;
    return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

export function calculateActivityScore(lastActiveAt: Date | string | null | undefined, now = new Date()) {
    if (!lastActiveAt) return 35;

    const activeAt = lastActiveAt instanceof Date ? lastActiveAt : new Date(lastActiveAt);
    if (!Number.isFinite(activeAt.getTime())) return 35;

    const minutesAgo = Math.max(0, (now.getTime() - activeAt.getTime()) / 60000);
    if (minutesAgo <= 10) return 100;
    if (minutesAgo <= 60) return 92;
    if (minutesAgo <= 24 * 60) return 82;
    if (minutesAgo <= 3 * 24 * 60) return 66;
    if (minutesAgo <= 7 * 24 * 60) return 45;
    return 20;
}

export function calculateResponseScore(input: {
    openToMeetCount?: number | null;
    passCount?: number | null;
    noResponseCount?: number | null;
    ghostingPenalty?: number | null;
}) {
    const openToMeetCount = Math.max(0, input.openToMeetCount ?? 0);
    const passCount = Math.max(0, input.passCount ?? 0);
    const noResponseCount = Math.max(0, input.noResponseCount ?? 0);
    const ghostingPenalty = clampProfileIntelligenceScore(input.ghostingPenalty ?? 0);

    const totalDecisions = openToMeetCount + passCount + noResponseCount;
    const smoothedPositive = openToMeetCount + 2;
    const smoothedTotal = totalDecisions + 4;
    const responseRate = (smoothedPositive / smoothedTotal) * 100;

    return clampProfileIntelligenceScore(
        responseRate - Math.min(18, noResponseCount * 4) - Math.min(25, ghostingPenalty),
    );
}

export function calculateInboundInterestScore(input: {
    likesReceivedCount?: number | null;
    viewsReceivedCount?: number | null;
    recentLikesReceivedCount?: number | null;
}) {
    const likesReceivedCount = Math.max(0, input.likesReceivedCount ?? 0);
    const viewsReceivedCount = Math.max(0, input.viewsReceivedCount ?? 0);
    const recentLikesReceivedCount = Math.max(0, input.recentLikesReceivedCount ?? 0);
    const totalExposure = likesReceivedCount + viewsReceivedCount;

    const smoothedRate = ((likesReceivedCount + 1) / (totalExposure + 4)) * 100;
    const volumeBoost = Math.min(25, Math.log1p(likesReceivedCount) * 9);
    const recencyBoost = Math.min(20, recentLikesReceivedCount * 6);

    return clampProfileIntelligenceScore(smoothedRate * 0.65 + volumeBoost + recencyBoost);
}

export function calculateMutualConversionScore(input: {
    shownCount?: number | null;
    mutualMatchesCount?: number | null;
    openToMeetCount?: number | null;
}) {
    const shownCount = Math.max(0, input.shownCount ?? 0);
    const mutualMatchesCount = Math.max(0, input.mutualMatchesCount ?? 0);
    const openToMeetCount = Math.max(0, input.openToMeetCount ?? 0);

    const smoothedMutualRate = ((mutualMatchesCount + 1) / (shownCount + 5)) * 100;
    const intentBoost = Math.min(18, Math.log1p(openToMeetCount) * 7);

    return clampProfileIntelligenceScore(smoothedMutualRate * 0.8 + intentBoost);
}

export function calculateCandidateStrengthScore(input: {
    activityScore?: number | null;
    responseScore?: number | null;
    inboundInterestScore?: number | null;
    mutualConversionScore?: number | null;
    profileCompletenessScore?: number | null;
    photoPresentationScore?: number | null;
}) {
    const score =
        clampProfileIntelligenceScore(input.activityScore) * CANDIDATE_STRENGTH_WEIGHTS.activityScore +
        clampProfileIntelligenceScore(input.responseScore) * CANDIDATE_STRENGTH_WEIGHTS.responseScore +
        clampProfileIntelligenceScore(input.inboundInterestScore) * CANDIDATE_STRENGTH_WEIGHTS.inboundInterestScore +
        clampProfileIntelligenceScore(input.mutualConversionScore) * CANDIDATE_STRENGTH_WEIGHTS.mutualConversionScore +
        clampProfileIntelligenceScore(input.profileCompletenessScore) * CANDIDATE_STRENGTH_WEIGHTS.profileCompletenessScore +
        clampProfileIntelligenceScore(input.photoPresentationScore) * CANDIDATE_STRENGTH_WEIGHTS.photoPresentationScore;

    return clampProfileIntelligenceScore(score);
}

export function calculateBehaviorSignalScores(input: BehaviorSignalInput): BehaviorSignalScores {
    const activityScore = calculateActivityScore(input.lastActiveAt, input.now);
    const responseScore = calculateResponseScore(input);
    const inboundInterestScore = calculateInboundInterestScore(input);
    const mutualConversionScore = calculateMutualConversionScore(input);
    const candidateStrengthScore = calculateCandidateStrengthScore({
        activityScore,
        responseScore,
        inboundInterestScore,
        mutualConversionScore,
        profileCompletenessScore: input.profileCompletenessScore,
        photoPresentationScore: input.photoPresentationScore,
    });

    return {
        activityScore,
        responseScore,
        inboundInterestScore,
        mutualConversionScore,
        candidateStrengthScore,
    };
}
