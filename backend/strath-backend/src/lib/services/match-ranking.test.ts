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

    assert.ok(result.score >= 80);
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

    assert.ok(result.score < 70);
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

    assert.ok(result.score >= 30);
    assert.ok(result.score <= 75);
});
