import test from "node:test";
import assert from "node:assert/strict";
import {
    collectUsersIPassedIds,
    compareScoredCandidatesForFairness,
    computeEffectiveMinScore,
    collectDyadExcludedIds,
    collectRecentlyShownIds,
    buildRecommendationCooldownTiers,
    computeRecommendationExposurePenalty,
    resolveRecommendationCooldownDays,
    shortlistDayKeysWithinCooldown,
    shouldSkipCandidateForExistingDyad,
    utcDayKey,
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

test("computeRecommendationExposurePenalty: scales by show count and caps at 40", () => {
    assert.equal(computeRecommendationExposurePenalty(0), 0);
    assert.equal(computeRecommendationExposurePenalty(3), 15);
    assert.equal(computeRecommendationExposurePenalty(8), 40);
    assert.equal(computeRecommendationExposurePenalty(20), 40);
});

test("shortlistDayKeysWithinCooldown: includes today and prior days", () => {
    const now = new Date("2026-06-20T15:00:00Z");
    assert.deepEqual(shortlistDayKeysWithinCooldown(3, now), ["2026-06-20", "2026-06-19", "2026-06-18"]);
});

test("collectRecentlyShownIds: unions multiple groups", () => {
    const merged = collectRecentlyShownIds(["a", "b"], new Set(["b", "c"]));
    assert.deepEqual([...merged].sort(), ["a", "b", "c"]);
});

test("collectDyadExcludedIds: skips active and recent expired dyads", () => {
    const pairMap = new Map<string, PairAggregateSnapshot>([
        ["active-user", { hasClosedOrMutual: false, hasActive: true, oldestExpiredCreatedAt: null }],
        ["expired-user", {
            hasClosedOrMutual: false,
            hasActive: false,
            oldestExpiredCreatedAt: new Date("2026-06-18T00:00:00Z"),
        }],
        ["eligible-user", { hasClosedOrMutual: false, hasActive: false, oldestExpiredCreatedAt: null }],
    ]);
    const cutoff = new Date("2026-06-10T00:00:00Z");
    assert.deepEqual([...collectDyadExcludedIds(pairMap, cutoff)].sort(), ["active-user", "expired-user"]);
});

test("buildRecommendationCooldownTiers: dedupes and sorts descending", () => {
    assert.deepEqual(buildRecommendationCooldownTiers(7), [7, 3, 1]);
    assert.deepEqual(buildRecommendationCooldownTiers(3), [3, 1]);
});

test("resolveRecommendationCooldownDays: picks strictest tier with enough candidates", () => {
    const tiers = buildRecommendationCooldownTiers(7);
    const resolution = resolveRecommendationCooldownDays({
        tiers,
        minRequired: 5,
        eligibleCountsByTier: new Map([
            [7, 2],
            [3, 6],
            [1, 20],
        ]),
    });
    assert.deepEqual(resolution, { cooldownDays: 3, fallbackTier: 1 });
});

test("resolveRecommendationCooldownDays: falls back to loosest tier when pool is tiny", () => {
    const tiers = buildRecommendationCooldownTiers(7);
    const resolution = resolveRecommendationCooldownDays({
        tiers,
        minRequired: 5,
        eligibleCountsByTier: new Map([
            [7, 1],
            [3, 2],
            [1, 3],
        ]),
    });
    assert.deepEqual(resolution, { cooldownDays: 1, fallbackTier: 2 });
});
