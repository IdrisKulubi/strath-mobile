import test from "node:test";
import assert from "node:assert/strict";
import {
    collectUsersIPassedIds,
    compareScoredCandidatesForFairness,
    computeEffectiveMinScore,
    shouldSkipCandidateForExistingDyad,
    type ClosedPairDecisionRow,
    type FairnessRelaxConfig,
    type PairAggregateSnapshot,
} from "@/lib/matching/candidate-pool-policy";

const defaultFairness: FairnessRelaxConfig = {
    waitDaysBeforeRelax: 3,
    scoreRelaxPerStep: 2,
    maxRelaxSteps: 4,
    sparsePoolThreshold: 8,
    sparseExtraRelaxSteps: 1,
    maxTotalRelaxSteps: 6,
};

test("collectUsersIPassedIds: A passed B pending — only A rejects B", () => {
    const rows: ClosedPairDecisionRow[] = [
        { userAId: "a", userBId: "b", aDecision: "passed", bDecision: "pending" },
    ];
    assert.deepEqual([...collectUsersIPassedIds("a", rows)].sort(), ["b"]);
    assert.deepEqual([...collectUsersIPassedIds("b", rows)], []);
});

test("collectUsersIPassedIds: both passed — each rejected the other", () => {
    const rows: ClosedPairDecisionRow[] = [
        { userAId: "a", userBId: "b", aDecision: "passed", bDecision: "passed" },
    ];
    assert.deepEqual([...collectUsersIPassedIds("a", rows)].sort(), ["b"]);
    assert.deepEqual([...collectUsersIPassedIds("b", rows)].sort(), ["a"]);
});

test("collectUsersIPassedIds: B passed only (canonical A<B ids)", () => {
    const rows: ClosedPairDecisionRow[] = [
        { userAId: "a", userBId: "z", aDecision: "pending", bDecision: "passed" },
    ];
    assert.deepEqual([...collectUsersIPassedIds("z", rows)], ["a"]);
    assert.deepEqual([...collectUsersIPassedIds("a", rows)], []);
});

test("shouldSkipCandidateForExistingDyad: closed or mutual blocks recycle", () => {
    const closed: PairAggregateSnapshot = {
        hasClosedOrMutual: true,
        hasActive: false,
        oldestExpiredCreatedAt: null,
    };
    const cutoff = new Date(0);
    assert.equal(shouldSkipCandidateForExistingDyad(closed, cutoff), true);
});

test("shouldSkipCandidateForExistingDyad: active blocks second slot", () => {
    const active: PairAggregateSnapshot = {
        hasClosedOrMutual: false,
        hasActive: true,
        oldestExpiredCreatedAt: null,
    };
    assert.equal(shouldSkipCandidateForExistingDyad(active, new Date(0)), true);
});

test("shouldSkipCandidateForExistingDyad: expired within cooldown skips", () => {
    const expiredRecent: PairAggregateSnapshot = {
        hasClosedOrMutual: false,
        hasActive: false,
        oldestExpiredCreatedAt: new Date("2026-01-10T12:00:00Z"),
    };
    const cutoff = new Date("2026-01-09T00:00:00Z");
    assert.equal(shouldSkipCandidateForExistingDyad(expiredRecent, cutoff), true);
});

test("shouldSkipCandidateForExistingDyad: no aggregate allows candidate", () => {
    assert.equal(shouldSkipCandidateForExistingDyad(undefined, new Date()), false);
});

test("shouldSkipCandidateForExistingDyad: expired before cooldown allows", () => {
    const expiredOld: PairAggregateSnapshot = {
        hasClosedOrMutual: false,
        hasActive: false,
        oldestExpiredCreatedAt: new Date("2026-01-01T12:00:00Z"),
    };
    const cutoff = new Date("2026-01-10T00:00:00Z");
    assert.equal(shouldSkipCandidateForExistingDyad(expiredOld, cutoff), false);
});

test("computeEffectiveMinScore: no pair history — no wait relax", () => {
    const v = computeEffectiveMinScore({
        baseMin: 58,
        absoluteFloor: 50,
        waitDays: 999,
        hasPairHistory: false,
        reciprocalPoolSize: 100,
        imbalanceExtraRelaxStep: false,
        config: defaultFairness,
    });
    assert.equal(v, 58);
});

test("computeEffectiveMinScore: wait days relax", () => {
    const v = computeEffectiveMinScore({
        baseMin: 58,
        absoluteFloor: 50,
        waitDays: 9,
        hasPairHistory: true,
        reciprocalPoolSize: 100,
        imbalanceExtraRelaxStep: false,
        config: defaultFairness,
    });
    assert.equal(v, 52);
});

test("computeEffectiveMinScore: clamps to absolute floor", () => {
    const v = computeEffectiveMinScore({
        baseMin: 58,
        absoluteFloor: 50,
        waitDays: 90,
        hasPairHistory: true,
        reciprocalPoolSize: 100,
        imbalanceExtraRelaxStep: false,
        config: defaultFairness,
    });
    assert.equal(v, 50);
});

test("computeEffectiveMinScore: sparse pool adds relax steps", () => {
    const v = computeEffectiveMinScore({
        baseMin: 58,
        absoluteFloor: 50,
        waitDays: 0,
        hasPairHistory: true,
        reciprocalPoolSize: 5,
        imbalanceExtraRelaxStep: false,
        config: defaultFairness,
    });
    assert.equal(v, 56);
});

test("computeEffectiveMinScore: imbalance adds one step", () => {
    const v = computeEffectiveMinScore({
        baseMin: 58,
        absoluteFloor: 50,
        waitDays: 0,
        hasPairHistory: true,
        reciprocalPoolSize: 100,
        imbalanceExtraRelaxStep: true,
        config: defaultFairness,
    });
    assert.equal(v, 56);
});

test("compareScoredCandidatesForFairness: score then exposure then id", () => {
    const a = { score: 70, candidateUserId: "z", activeExposureCount: 1 };
    const b = { score: 71, candidateUserId: "a", activeExposureCount: 0 };
    assert(compareScoredCandidatesForFairness(a, b) > 0);

    const tieScore = { score: 70, candidateUserId: "m", activeExposureCount: 2 };
    const tieScore2 = { score: 70, candidateUserId: "n", activeExposureCount: 1 };
    assert(compareScoredCandidatesForFairness(tieScore, tieScore2) > 0);

    const tieExp = { score: 70, candidateUserId: "b", activeExposureCount: 1 };
    const tieExp2 = { score: 70, candidateUserId: "c", activeExposureCount: 1 };
    assert(compareScoredCandidatesForFairness(tieExp, tieExp2) < 0);
});
