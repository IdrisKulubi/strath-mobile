import assert from "node:assert/strict";
import test from "node:test";

import { buildMatchmakerStarterSuggestions } from "@/lib/matchmaker/starter-suggestions";

test("starter suggestions prioritize profile and confirmed preference context", () => {
    const suggestions = buildMatchmakerStarterSuggestions({
        seed: "session-one",
        confirmedPreferences: [{ value: "emotionally mature", sentiment: "prefer" }],
        relationshipGoal: "long_term",
        communicationStyle: "direct",
        interestTags: ["photography"],
    });

    assert.equal(suggestions.length, 4);
    assert.ok(suggestions.some((value) => /emotionally mature|long term|direct|photography/i.test(value)));
    assert.equal(new Set(suggestions.map((value) => value.toLowerCase())).size, 4);
});

test("starter suggestions are stable within a session and rotate between sessions", () => {
    const input = {
        confirmedPreferences: [{ value: "calm", sentiment: "prefer" as const }],
        qualities: ["kindness", "humor"],
        socialVibe: "quiet",
    };
    const first = buildMatchmakerStarterSuggestions({ ...input, seed: "session-one" });
    const repeated = buildMatchmakerStarterSuggestions({ ...input, seed: "session-one" });
    const next = buildMatchmakerStarterSuggestions({ ...input, seed: "session-two" });

    assert.deepEqual(repeated, first);
    assert.notDeepEqual(next, first);
});
