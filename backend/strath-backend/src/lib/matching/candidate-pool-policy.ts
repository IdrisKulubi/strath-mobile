/**
 * Candidate pool policy — single place for “who can be shown to whom” invariants.
 *
 * Invariants (home / candidate_pairs flow):
 * 1. **Dyad dead:** If we already have `closed` or `mutual` (or `active`/`queued`) with user X,
 *    we do not create another candidate row for that unordered pair (`getExistingPairMap` in the service).
 * 2. **Directional pass:** Only exclude user Y from *my* feed when **I** recorded `passed` on a `closed`
 *    row with Y — not when only the other person passed (`collectUsersIPassedIds`).
 * 3. **Blocks & matches:** Block list and existing date/mutual matches exclude those users entirely
 *    (loaded separately in the orchestrator).
 * 4. **Reciprocal gender** stays in the orchestrator (needs full profiles).
 *
 * **Fairness (effective minimum score):** Does not guarantee everyone gets a mutual match in a skewed
 * market. It reduces starvation when the reciprocal pool is small or the viewer has waited a long time
 * since any candidate row, by lowering the score bar toward `absoluteFloor` in controlled steps.
 */

export type CandidateDecisionSnapshot = "pending" | "open_to_meet" | "passed";

/** Minimal row shape for computing “users I passed” without DB. */
export type ClosedPairDecisionRow = {
    userAId: string;
    userBId: string;
    aDecision: CandidateDecisionSnapshot;
    bDecision: CandidateDecisionSnapshot;
};

export type PairAggregateSnapshot = {
    hasClosedOrMutual: boolean;
    hasActive: boolean;
    oldestExpiredCreatedAt: Date | null;
};

/** Tunable knobs for `computeEffectiveMinScore` (usually from env in the orchestrator). */
export type FairnessRelaxConfig = {
    waitDaysBeforeRelax: number;
    scoreRelaxPerStep: number;
    maxRelaxSteps: number;
    sparsePoolThreshold: number;
    sparseExtraRelaxSteps: number;
    /** Hard cap on sum of wait + sparse + imbalance steps (after composition). */
    maxTotalRelaxSteps: number;
};

/**
 * Users the viewer explicitly passed on a closed pair (never show them to the viewer again).
 * Does not include cases where the other person passed but the viewer did not.
 */
export function collectUsersIPassedIds(viewerId: string, rows: ClosedPairDecisionRow[]): Set<string> {
    const out = new Set<string>();
    for (const row of rows) {
        if (row.userAId === viewerId && row.aDecision === "passed") {
            out.add(row.userBId);
        }
        if (row.userBId === viewerId && row.bDecision === "passed") {
            out.add(row.userAId);
        }
    }
    return out;
}

/**
 * Skip scoring this candidate: existing dyad rules + expired cooldown before re-showing same person.
 */
export function shouldSkipCandidateForExistingDyad(
    aggregate: PairAggregateSnapshot | undefined,
    cooldownCutoff: Date,
): boolean {
    if (!aggregate) {
        return false;
    }
    if (aggregate.hasClosedOrMutual) {
        return true;
    }
    if (aggregate.hasActive) {
        return true;
    }
    if (
        aggregate.oldestExpiredCreatedAt &&
        aggregate.oldestExpiredCreatedAt >= cooldownCutoff
    ) {
        return true;
    }
    return false;
}

export type EffectiveMinScoreInput = {
    baseMin: number;
    absoluteFloor: number;
    /** Days since the viewer’s most recent candidate_pair row was created (0 if none). */
    waitDays: number;
    /** False when the viewer has never had any candidate_pair row — no wait-based relax. */
    hasPairHistory: boolean;
    reciprocalPoolSize: number;
    /** Optional +1 relax step when opposite-side pool is critically small (service computes). */
    imbalanceExtraRelaxStep: boolean;
    config: FairnessRelaxConfig;
};

/**
 * Effective minimum compatibility score for this generation attempt.
 * - Wait-based relax only applies when `hasPairHistory` (avoid relaxing brand-new accounts).
 * - Sparse pool adds extra relax steps when few reciprocal candidates exist after filters.
 */
export function computeEffectiveMinScore(input: EffectiveMinScoreInput): number {
    const { baseMin, absoluteFloor, waitDays, hasPairHistory, reciprocalPoolSize, imbalanceExtraRelaxStep, config: c } =
        input;

    let relaxSteps = 0;
    if (hasPairHistory && c.waitDaysBeforeRelax > 0) {
        relaxSteps += Math.min(c.maxRelaxSteps, Math.floor(waitDays / c.waitDaysBeforeRelax));
    }
    if (reciprocalPoolSize <= c.sparsePoolThreshold) {
        relaxSteps += c.sparseExtraRelaxSteps;
    }
    if (imbalanceExtraRelaxStep) {
        relaxSteps += 1;
    }

    relaxSteps = Math.min(relaxSteps, c.maxTotalRelaxSteps);
    const reduction = relaxSteps * c.scoreRelaxPerStep;
    return Math.max(absoluteFloor, baseMin - reduction);
}

/** One scored row for stable ordering (higher score, then lower exposure, then user id). */
export type ScoredCandidateForFairness = {
    score: number;
    candidateUserId: string;
    activeExposureCount: number;
};

/**
 * Sort key: higher score first; ties prefer lower active exposure on the candidate; then deterministic id.
 */
export function compareScoredCandidatesForFairness(a: ScoredCandidateForFairness, b: ScoredCandidateForFairness): number {
    if (b.score !== a.score) {
        return b.score - a.score;
    }
    if (a.activeExposureCount !== b.activeExposureCount) {
        return a.activeExposureCount - b.activeExposureCount;
    }
    return a.candidateUserId.localeCompare(b.candidateUserId);
}
