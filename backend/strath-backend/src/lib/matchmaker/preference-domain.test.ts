import test from "node:test";
import assert from "node:assert/strict";

import {
    assertValidBriefOperations,
    buildFeedbackLearningPlan,
    buildLegacyPreferenceSeeds,
    inferPreferenceCategory,
    normalizePreferenceValue,
} from "@/lib/matchmaker/preference-domain";

test("legacy memory becomes inferred and flexible", () => {
    const seeds = buildLegacyPreferenceSeeds({
        positiveSignals: { prefer_serious: 2, music: 1 },
        negativeSignals: { avoid_very_social: 1.5 },
    });

    assert.equal(seeds.length, 3);
    assert.ok(seeds.every((seed) => seed.certainty === "inferred"));
    assert.ok(seeds.every((seed) => seed.importance === "flexible"));
    assert.ok(seeds.every((seed) => seed.source === "migrated_memory"));
    assert.equal(seeds.find((seed) => seed.normalizedValue === "serious")?.category, "relationship_intent");
    assert.equal(seeds.find((seed) => seed.normalizedValue === "very_social")?.sentiment, "avoid");
});

test("legacy migration preserves contradictory sentiment for later clarification", () => {
    const seeds = buildLegacyPreferenceSeeds({
        positiveSignals: { calm: 1 },
        negativeSignals: { calm: 0.5 },
    });

    assert.equal(seeds.length, 2);
    assert.deepEqual(new Set(seeds.map((seed) => seed.sentiment)), new Set(["prefer", "avoid"]));
    assert.ok(seeds.every((seed) => seed.certainty === "inferred"));
});

test("candidate-only rejection produces no global signals", () => {
    const plan = buildFeedbackLearningPlan({
        outcome: "not_this_one",
        reason: "Too social",
        candidateSignals: ["music", "infj", "calm"],
    });

    assert.deepEqual(plan.positiveSignals, []);
    assert.deepEqual(plan.negativeSignals, []);
    assert.ok(plan.historySignals.includes("music"));
});

test("explicit future feedback separates prefer and avoid signals", () => {
    const plan = buildFeedbackLearningPlan({
        outcome: "not_this_one",
        reason: "Too social",
        candidateSignals: ["music"],
        learningScope: "future_matches",
    });

    assert.deepEqual(plan.positiveSignals, ["calm"]);
    assert.deepEqual(plan.negativeSignals.sort(), ["music", "very_social"].sort());
});

test("normalization and category inference are stable", () => {
    assert.equal(normalizePreferenceValue("  Low-drama & Consistent  "), "low_drama_consistent");
    assert.equal(inferPreferenceCategory("emotionally consistent communication"), "communication");
    assert.equal(inferPreferenceCategory("INFJ"), "personality");
});

test("brief operations reject empty values and empty batches", () => {
    assert.throws(() => assertValidBriefOperations([]));
    assert.throws(() => assertValidBriefOperations([{
        type: "add",
        category: "other",
        value: "   ",
    }]));
});
