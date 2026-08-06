import assert from "node:assert/strict";
import test from "node:test";

import {
    buildMatchmakerBriefSearchPlan,
    buildMatchmakerSearchConfirmation,
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

test("search confirmation uses confirmed criteria and labels inferred items as unresolved", () => {
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
    assert.match(buildMatchmakerSearchConfirmation(value), /won’t treat it as a filter/i);
});

test("contradictory criteria are withheld from the persisted search plan", () => {
    const value = brief([
        preference({ value: "calm", category: "social_energy", sentiment: "prefer" }),
        preference({ value: "calm", category: "social_energy", sentiment: "avoid" }),
    ]);
    const plan = buildMatchmakerBriefSearchPlan(value);
    assert.deepEqual(plan.priorities, []);
    assert.deepEqual(plan.avoid, []);
});
