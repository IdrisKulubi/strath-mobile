import assert from "node:assert/strict";
import test from "node:test";

import {
    buildMatchmakerBriefSearchPlan,
    buildMatchmakerBriefSummary,
    buildMatchmakerSearchConfirmation,
    findMatchmakerBriefContradictions,
    inferredPreferenceOverflow,
    MAX_ACTIVE_INFERRED_PREFERENCES,
    type MatchmakerBrief,
    type MatchmakerBriefPreference,
} from "@/lib/services/matchmaker-preference-service";

function preference(overrides: Partial<MatchmakerBriefPreference>): MatchmakerBriefPreference {
    return {
        id: crypto.randomUUID(),
        category: "other",
        value: "kind",
        sentiment: "prefer",
        importance: "prefer",
        certainty: "confirmed",
        source: "direct",
        status: "active",
        version: 1,
        metadata: {},
        createdAt: new Date(0).toISOString(),
        updatedAt: new Date(0).toISOString(),
        ...overrides,
    };
}

function brief(preferences: MatchmakerBriefPreference[]): MatchmakerBrief {
    return { version: 3, latestChangeId: null, preferences, updatedAt: null };
}

test("search confirmation uses confirmed criteria without enumerating inferred suggestions", () => {
    const value = brief([
        preference({ value: "emotionally mature", importance: "must_have" }),
        preference({ value: "balanced social energy", category: "social_energy", certainty: "inferred" }),
        preference({ value: "smoking", category: "lifestyle", sentiment: "avoid" }),
    ]);
    const plan = buildMatchmakerBriefSearchPlan(value);
    assert.deepEqual(plan.mustHaves, ["emotionally mature"]);
    assert.deepEqual(plan.avoid, ["smoking"]);
    assert.deepEqual(plan.unresolved, ["balanced social energy"]);
    assert.match(buildMatchmakerSearchConfirmation(value), /must-haves: emotionally mature/i);
    assert.doesNotMatch(buildMatchmakerSearchConfirmation(value), /balanced social energy/i);
    assert.doesNotMatch(buildMatchmakerBriefSummary(value), /balanced social energy/i);
});

test("contradictory confirmed criteria are withheld from the persisted search plan", () => {
    const value = brief([
        preference({ value: "calm", category: "social_energy", sentiment: "prefer" }),
        preference({ value: "calm", category: "social_energy", sentiment: "avoid" }),
    ]);
    const plan = buildMatchmakerBriefSearchPlan(value);
    assert.deepEqual(plan.priorities, []);
    assert.deepEqual(plan.avoid, []);
});

test("an inferred preference cannot create a contradiction with a confirmed preference", () => {
    const value = brief([
        preference({ value: "calm", category: "social_energy", sentiment: "prefer" }),
        preference({
            value: "calm",
            category: "social_energy",
            sentiment: "avoid",
            certainty: "inferred",
            source: "system",
        }),
    ]);
    assert.deepEqual(findMatchmakerBriefContradictions(value), []);
    assert.deepEqual(buildMatchmakerBriefSearchPlan(value).priorities, ["calm"]);
});

test("inferred review overflow keeps fifteen recent system suggestions before migrated memory", () => {
    const values = Array.from({ length: 17 }, (_, index) => preference({
        id: String(index).padStart(2, "0"),
        value: `preference ${index}`,
        certainty: "inferred",
        source: index < 2 ? "migrated_memory" : "system",
        createdAt: new Date(index * 1_000).toISOString(),
        updatedAt: new Date(index * 1_000).toISOString(),
    }));
    values.push(preference({ value: "confirmed stays outside the cap" }));

    const overflow = inferredPreferenceOverflow(values);
    assert.equal(MAX_ACTIVE_INFERRED_PREFERENCES, 15);
    assert.equal(overflow.length, 2);
    assert.deepEqual(overflow.map((item) => item.id), ["01", "00"]);
    assert.ok(overflow.every((item) => item.certainty === "inferred"));
});
