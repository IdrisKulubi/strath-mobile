import test from "node:test";
import assert from "node:assert/strict";
import { scoreProfilePair } from "@/lib/services/match-ranking";

function buildProfile(overrides: Record<string, unknown> = {}) {
    return {
        userId: "user-1",
        age: 21,
        bio: "I love music, coffee dates and deep conversations.",
        aboutMe: "Kind, playful and intentional.",
        interests: ["music", "coffee", "reading"],
        qualities: ["kindness", "humor"],
        languages: ["english", "swahili"],
        lookingFor: "serious relationship",
        course: "Computer Science",
        yearOfStudy: 3,
        university: "Strathmore",
        personalityType: "ENFP",
        personalitySummary: "Warm, playful and emotionally aware.",
        communicationStyle: "both",
        loveLanguage: "quality time",
        prompts: [{ promptId: "weekend", response: "Coffee, music and campus walks" }],
        lastActive: new Date(),
        profileCompleted: true,
        photos: ["a.jpg", "b.jpg"],
        profilePhoto: "avatar.jpg",
        personalityAnswers: {
            sleepSchedule: "night_owl",
            socialVibe: "balanced",
            convoStyle: "deep_talks",
            socialBattery: "ambivert",
            idealDateVibe: "coffee_and_walk",
        },
        lifestyleAnswers: {
            relationshipGoal: "serious_relationship",
            outingFrequency: "sometimes",
            drinks: "rarely",
            smokes: "no",
        },
        ...overrides,
    };
}

test("scoreProfilePair rewards strong compatibility", () => {
    const mine = buildProfile({ userId: "me" });
    const theirs = buildProfile({ userId: "them" });

    const result = scoreProfilePair(mine as never, theirs as never);

    assert.ok(result.score >= 85, `expected score >= 85, got ${result.score}`);
    assert.ok(result.reasons.length > 0);
});

test("scoreProfilePair penalizes misaligned relationship goals", () => {
    const mine = buildProfile({ userId: "me", lookingFor: "serious relationship" });
    const theirs = buildProfile({
        userId: "them",
        lookingFor: "something casual",
        interests: ["gaming"],
        qualities: ["ambition"],
        personalityAnswers: { sleepSchedule: "early_bird" },
        lifestyleAnswers: { relationshipGoal: "casual" },
    });

    const result = scoreProfilePair(mine as never, theirs as never);

    assert.ok(result.score < 70, `expected score < 70, got ${result.score}`);
});

test("scoreProfilePair deeply penalizes fully incompatible profiles", () => {
    const mine = buildProfile({
        userId: "me",
        lookingFor: "serious relationship",
        interests: ["reading", "faith", "coffee"],
        qualities: ["kindness", "loyalty"],
        personalityAnswers: { sleepSchedule: "early_bird", socialVibe: "introvert" },
        lifestyleAnswers: { relationshipGoal: "serious_relationship", drinks: "no", smokes: "no" },
    });
    const theirs = buildProfile({
        userId: "them",
        lookingFor: "just looking for flings",
        interests: ["gaming", "partying"],
        qualities: ["humor"],
        university: "Other U",
        course: "Something Else",
        yearOfStudy: 1,
        personalityAnswers: { sleepSchedule: "night_owl", socialVibe: "extrovert" },
        lifestyleAnswers: { relationshipGoal: "casual", drinks: "often", smokes: "often" },
    });

    const result = scoreProfilePair(mine as never, theirs as never);

    // Should comfortably fall below the MIN_CANDIDATE_MATCH_SCORE gate (72).
    assert.ok(result.score < 68, `expected score < 68, got ${result.score}`);
});

test("scoreProfilePair still gives a stable middle score for sparse profiles", () => {
    const mine = buildProfile({ userId: "me" });
    const theirs = buildProfile({
        userId: "them",
        bio: null,
        aboutMe: null,
        interests: [],
        qualities: [],
        languages: [],
        lookingFor: null,
        communicationStyle: null,
        loveLanguage: null,
        prompts: [],
        personalityAnswers: {},
        lifestyleAnswers: {},
        photos: [],
        profilePhoto: null,
    });

    const result = scoreProfilePair(mine as never, theirs as never);

    assert.ok(result.score >= 40, `expected score >= 40, got ${result.score}`);
    assert.ok(result.score <= 80, `expected score <= 80, got ${result.score}`);
});

test("scoreProfilePair treats interest synonyms as shared", () => {
    const mine = buildProfile({
        userId: "me",
        interests: ["music", "working out", "reading"],
    });
    const theirs = buildProfile({
        userId: "them",
        interests: ["listening to music", "gym", "books"],
    });

    const result = scoreProfilePair(mine as never, theirs as never);

    assert.ok(
        result.components.interests >= 85,
        `expected interests component >= 85 for synonym overlap, got ${result.components.interests}`,
    );
});

test("scoreProfilePair gives credit for near-match relationship intent", () => {
    const mine = buildProfile({ userId: "me", lookingFor: "serious relationship" });
    const theirs = buildProfile({ userId: "them", lookingFor: "looking for something long term" });

    const result = scoreProfilePair(mine as never, theirs as never);

    assert.ok(
        result.components.relationshipIntent >= 90,
        `expected intent >= 90 for serious<->long_term, got ${result.components.relationshipIntent}`,
    );
});

test("scoreProfilePair treats compatible-but-different lifestyle answers as near match", () => {
    const mine = buildProfile({
        userId: "me",
        lifestyleAnswers: {
            relationshipGoal: "serious_relationship",
            outingFrequency: "sometimes",
            drinks: "no",
            smokes: "no",
        },
    });
    const theirs = buildProfile({
        userId: "them",
        lifestyleAnswers: {
            relationshipGoal: "long_term",
            outingFrequency: "often",
            drinks: "rarely",
            smokes: "no",
        },
    });

    const result = scoreProfilePair(mine as never, theirs as never);

    assert.ok(
        result.components.lifestyle >= 80,
        `expected lifestyle component >= 80 for compatible-but-different answers, got ${result.components.lifestyle}`,
    );
});

test("scoreProfilePair treats compatible-but-different personality answers as near match", () => {
    const mine = buildProfile({
        userId: "me",
        personalityAnswers: {
            sleepSchedule: "night_owl",
            socialVibe: "ambivert",
            convoStyle: "deep_talks",
        },
    });
    const theirs = buildProfile({
        userId: "them",
        personalityAnswers: {
            sleepSchedule: "late_riser",
            socialVibe: "introvert",
            convoStyle: "thoughtful",
        },
    });

    const result = scoreProfilePair(mine as never, theirs as never);

    assert.ok(
        result.components.personality >= 80,
        `expected personality component >= 80 for compatible answers, got ${result.components.personality}`,
    );
});
