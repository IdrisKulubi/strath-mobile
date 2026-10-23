import test from "node:test";
import assert from "node:assert/strict";

import { parseMatchmakerIntent } from "@/lib/services/matchmaker-intent-service";

test("parseMatchmakerIntent extracts safe traits and active intent", () => {
    const intent = parseMatchmakerIntent("I want someone calm, serious, and active today");

    assert.equal(intent.activeToday, true);
    assert.equal(intent.seriousIntent, true);
    assert.ok(intent.traits.includes("calm"));
    assert.ok(intent.traits.includes("serious"));
    assert.ok(intent.traits.includes("active"));
    assert.ok(intent.keywords.includes("calm"));
});

test("parseMatchmakerIntent normalizes long noisy text", () => {
    const intent = parseMatchmakerIntent("Someone!!! creative, into MUSIC, and chill ".repeat(30));

    assert.ok(intent.normalizedText.length <= 500);
    assert.ok(intent.traits.includes("creative"));
    assert.ok(intent.traits.includes("calm"));
});
