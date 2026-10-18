import test from "node:test";
import assert from "node:assert/strict";

import {
    buildWorkerProfilePayload,
    calculateCandidateStrengthScore,
    isProfileIntelligenceStale,
    mapWorkerAnalysisToProfileIntelligence,
    nextJobState,
    normalizeProfileIntelligenceInput,
    profileCompletenessScore,
} from "@/lib/services/profile-intelligence-service";

test("calculateCandidateStrengthScore weights activity and response most strongly", () => {
    const activeResponder = calculateCandidateStrengthScore({
        activityScore: 95,
        responseScore: 90,
        inboundInterestScore: 40,
        mutualConversionScore: 40,
        profileCompletenessScore: 65,
        photoPresentationScore: 70,
    });

    const popularDormant = calculateCandidateStrengthScore({
        activityScore: 10,
        responseScore: 20,
        inboundInterestScore: 95,
        mutualConversionScore: 80,
        profileCompletenessScore: 85,
        photoPresentationScore: 90,
    });

    assert.ok(activeResponder > popularDormant);
});

test("calculateCandidateStrengthScore clamps scores to 0..100", () => {
    assert.equal(
        calculateCandidateStrengthScore({
            activityScore: 500,
            responseScore: 500,
            inboundInterestScore: 500,
            mutualConversionScore: 500,
            profileCompletenessScore: 500,
            photoPresentationScore: 500,
        }),
        100,
    );

    assert.equal(
        calculateCandidateStrengthScore({
            activityScore: -50,
            responseScore: Number.NaN,
            inboundInterestScore: null,
            mutualConversionScore: undefined,
            profileCompletenessScore: -10,
            photoPresentationScore: -1,
        }),
        0,
    );
});

test("normalizeProfileIntelligenceInput computes candidate strength when absent", () => {
    const normalized = normalizeProfileIntelligenceInput({
        userId: "user-1",
        activityScore: 100,
        responseScore: 100,
        inboundInterestScore: 0,
        mutualConversionScore: 0,
        profileCompletenessScore: 50,
        photoPresentationScore: 50,
    });

    assert.equal(normalized.candidateStrengthScore, 63);
    assert.deepEqual(normalized.metadata, {});
    assert.ok(normalized.updatedAt instanceof Date);
});

test("normalizeProfileIntelligenceInput preserves explicit candidate strength after clamping", () => {
    const normalized = normalizeProfileIntelligenceInput({
        userId: "user-1",
        candidateStrengthScore: 140,
    });

    assert.equal(normalized.candidateStrengthScore, 100);
});

test("nextJobState moves pending job to processing and increments attempts", () => {
    const state = nextJobState({ attempts: 0, maxAttempts: 3 }, "processing");

    assert.equal(state.status, "processing");
    assert.equal(state.attempts, 1);
    assert.ok(state.lockedAt instanceof Date);
    assert.equal(state.completedAt, null);
});

test("nextJobState retries failed job until max attempts", () => {
    const retry = nextJobState({ attempts: 1, maxAttempts: 3 }, "failed", "timeout");
    assert.equal(retry.status, "pending");
    assert.equal(retry.attempts, 1);
    assert.equal(retry.lastError, "timeout");

    const exhausted = nextJobState({ attempts: 3, maxAttempts: 3 }, "failed", "timeout");
    assert.equal(exhausted.status, "failed");
});

test("nextJobState marks completed job with completedAt", () => {
    const state = nextJobState({ attempts: 2, maxAttempts: 3 }, "completed");

    assert.equal(state.status, "completed");
    assert.equal(state.attempts, 2);
    assert.equal(state.lockedAt, null);
    assert.ok(state.completedAt instanceof Date);
    assert.equal(state.lastError, null);
});

function buildProfile(overrides: Record<string, unknown> = {}) {
    return {
        id: "profile-1",
        userId: "user-1",
        firstName: "Amina",
        lastName: "Otieno",
        age: 22,
        gender: "female",
        university: "Strathmore",
        course: "Computer Science",
        yearOfStudy: 3,
        bio: "I like calm coffee dates.",
        aboutMe: "Calm, focused and intentional.",
        lookingFor: "intentional dating",
        interests: ["coffee", "music"],
        qualities: ["kindness"],
        prompts: [{ promptId: "weekend", response: "Coffee and music" }],
        personalityAnswers: { socialVibe: "calm" },
        lifestyleAnswers: { relationshipGoal: "serious_relationship" },
        profilePhoto: "https://example.com/a.jpg",
        photos: ["https://example.com/b.jpg"],
        profileCompleted: true,
        isComplete: true,
        lastActive: new Date("2026-07-02T08:00:00Z"),
        updatedAt: new Date("2026-07-02T09:00:00Z"),
        createdAt: new Date("2026-07-01T09:00:00Z"),
        role: "user",
        isVisible: true,
        incognitoMode: false,
        discoveryPaused: false,
        currentLocation: null,
        location: null,
        preferredGender: null,
        profileVisibility: null,
        profileViews: 0,
        matchesCount: 0,
        onboardingStep: null,
        dateOfBirth: null,
        waitlistStatus: "admitted",
        waitlistPosition: null,
        admittedAt: null,
        profilePhotoBlurhash: null,
        phoneNumber: null,
        isMatch: false,
        isAnonymous: false,
        anonymous: false,
        height: null,
        education: null,
        occupation: null,
        languages: [],
        communicationStyle: null,
        loveLanguage: null,
        latitude: null,
        longitude: null,
        visibilityMode: "standard",
        readReceiptsEnabled: true,
        showActiveStatus: true,
        username: null,
        faceVerificationStatus: "verified",
        faceVerifiedAt: null,
        faceVerificationMethod: null,
        faceVerificationVersion: null,
        aiConsentGranted: true,
        aiConsentUpdatedAt: null,
        ...overrides,
    };
}

test("isProfileIntelligenceStale: missing or old analysis is stale", () => {
    const now = new Date("2026-07-10T00:00:00Z");
    assert.equal(isProfileIntelligenceStale({ lastAnalyzedAt: null, now }), true);
    assert.equal(
        isProfileIntelligenceStale({
            lastAnalyzedAt: new Date("2026-07-01T00:00:00Z"),
            staleAfterDays: 7,
            now,
        }),
        true,
    );
    assert.equal(
        isProfileIntelligenceStale({
            lastAnalyzedAt: new Date("2026-07-09T00:00:00Z"),
            staleAfterDays: 7,
            now,
        }),
        false,
    );
});

test("isProfileIntelligenceStale: profile changes after analysis are stale", () => {
    assert.equal(
        isProfileIntelligenceStale({
            lastAnalyzedAt: new Date("2026-07-02T00:00:00Z"),
            lastProfileChangeAt: new Date("2026-07-03T00:00:00Z"),
            now: new Date("2026-07-04T00:00:00Z"),
        }),
        true,
    );
});

test("buildWorkerProfilePayload maps profile fields to worker payload", () => {
    const payload = buildWorkerProfilePayload(buildProfile() as never);
    assert.equal(payload.userId, "user-1");
    assert.equal(payload.firstName, "Amina");
    assert.equal(payload.yearOfStudy, 3);
    assert.deepEqual(payload.interests, ["coffee", "music"]);
    assert.equal(payload.photoUrl, "https://example.com/a.jpg");
});

test("profileCompletenessScore rewards complete profiles", () => {
    const complete = profileCompletenessScore(buildProfile() as never);
    const sparse = profileCompletenessScore(buildProfile({
        profileCompleted: false,
        isComplete: false,
        firstName: "",
        age: null,
        gender: null,
        course: null,
        university: null,
        lookingFor: null,
        aboutMe: null,
        bio: null,
        interests: [],
        profilePhoto: null,
        photos: [],
    }) as never);

    assert.ok(complete > sparse);
    assert.equal(complete, 100);
});

test("mapWorkerAnalysisToProfileIntelligence normalizes worker result for storage", () => {
    const profile = buildProfile();
    const mapped = mapWorkerAnalysisToProfileIntelligence({
        userId: "user-1",
        profile: profile as never,
        lastSeenAt: new Date("2026-07-03T10:00:00Z"),
        analysis: {
            profileSummary: "Amina seems calm.",
            searchText: "name: Amina",
            structuredTags: {
                traitTags: ["Calm", "Intentional"],
                datingIntentTags: ["Serious"],
                socialEnergyTags: ["Low"],
                lifestyleTags: ["Coffee"],
                interestTags: ["Reading"],
                communicationTags: ["Deep talks"],
                availabilityTags: ["Active recently"],
                dealbreakerTags: [],
            },
            textEmbedding: Array.from({ length: 768 }, () => 0),
            textEmbeddingProvider: "text-hash",
            textEmbeddingModel: "profile-text-hash-v1",
            photoPresentation: {
                photoPresentationScore: 87,
                faceVisible: true,
                imageClear: true,
                lightingScore: 80,
                hasMultiplePeople: false,
                isObjectOnly: false,
                moderationStatus: "approved",
                analysisVersion: "profile_photo_presentation_v1",
            },
            visualEmbedding: null,
            visualEmbeddingProvider: "clip-hash",
            visualEmbeddingModel: "hash-v1",
            analysisVersion: "profile_intelligence_worker_v1",
        },
    });

    assert.equal(mapped.userId, "user-1");
    assert.equal(mapped.profileSummary, "Amina seems calm.");
    assert.deepEqual(mapped.traitTags, ["calm", "intentional"]);
    assert.deepEqual(mapped.datingIntentTags, ["serious"]);
    assert.deepEqual(mapped.communicationTags, ["deep_talks"]);
    assert.equal(mapped.photoPresentationScore, 87);
    assert.equal(mapped.profileCompletenessScore, 100);
    assert.ok((mapped.candidateStrengthScore ?? 0) > 0);
    assert.ok(mapped.lastAnalyzedAt instanceof Date);
});
