import test from "node:test";
import assert from "node:assert/strict";

import {
    calculateActivityScore,
    calculateBehaviorSignalScores,
    calculateInboundInterestScore,
    calculateMutualConversionScore,
    calculateResponseScore,
} from "@/lib/services/profile-intelligence-scoring";

const now = new Date("2026-07-03T12:00:00Z");

test("calculateActivityScore follows recency boundaries", () => {
    assert.equal(calculateActivityScore(new Date("2026-07-03T11:55:00Z"), now), 100);
    assert.equal(calculateActivityScore(new Date("2026-07-03T11:15:00Z"), now), 92);
    assert.equal(calculateActivityScore(new Date("2026-07-03T02:00:00Z"), now), 82);
    assert.equal(calculateActivityScore(new Date("2026-07-01T12:00:00Z"), now), 66);
    assert.equal(calculateActivityScore(new Date("2026-06-29T12:00:00Z"), now), 45);
    assert.equal(calculateActivityScore(new Date("2026-06-20T12:00:00Z"), now), 20);
    assert.equal(calculateActivityScore(null, now), 35);
});

test("calculateResponseScore smooths small samples", () => {
    const newUser = calculateResponseScore({});
    const oneGoodDecision = calculateResponseScore({ openToMeetCount: 1 });
    const manyPasses = calculateResponseScore({ openToMeetCount: 1, passCount: 8 });
    const noResponse = calculateResponseScore({ openToMeetCount: 3, noResponseCount: 4, ghostingPenalty: 10 });

    assert.ok(newUser > 0);
    assert.ok(oneGoodDecision > newUser);
    assert.ok(manyPasses < oneGoodDecision);
    assert.ok(noResponse < oneGoodDecision);
});

test("inbound and mutual scores cap and reward useful signals", () => {
    assert.ok(
        calculateInboundInterestScore({ likesReceivedCount: 10, recentLikesReceivedCount: 3 }) >
        calculateInboundInterestScore({ likesReceivedCount: 0, viewsReceivedCount: 10 }),
    );
    assert.equal(
        calculateInboundInterestScore({ likesReceivedCount: 10_000, recentLikesReceivedCount: 10_000 }),
        100,
    );

    assert.ok(
        calculateMutualConversionScore({ shownCount: 20, mutualMatchesCount: 5, openToMeetCount: 6 }) >
        calculateMutualConversionScore({ shownCount: 20, mutualMatchesCount: 0, openToMeetCount: 0 }),
    );
});

test("calculateBehaviorSignalScores favors active responders over dormant popular users", () => {
    const activeResponder = calculateBehaviorSignalScores({
        lastActiveAt: new Date("2026-07-03T11:55:00Z"),
        openToMeetCount: 6,
        passCount: 1,
        likesReceivedCount: 2,
        recentLikesReceivedCount: 1,
        shownCount: 12,
        mutualMatchesCount: 2,
        profileCompletenessScore: 80,
        photoPresentationScore: 70,
        now,
    });
    const dormantPopular = calculateBehaviorSignalScores({
        lastActiveAt: new Date("2026-06-20T12:00:00Z"),
        openToMeetCount: 1,
        passCount: 8,
        likesReceivedCount: 20,
        recentLikesReceivedCount: 0,
        shownCount: 50,
        mutualMatchesCount: 3,
        profileCompletenessScore: 90,
        photoPresentationScore: 90,
        now,
    });

    assert.ok(activeResponder.candidateStrengthScore > dormantPopular.candidateStrengthScore);
});
