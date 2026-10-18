import test from "node:test";
import assert from "node:assert/strict";

import { evaluateMatchmakerRolloutGuardrails } from "@/lib/matchmaker/rollout-guardrails";

const healthy = { baselineApiErrorRatePct: 1, currentApiErrorRatePct: 2.9, repeatedCandidateRatePct: 1, creditMismatchCount: 0, unrecoverableStateCount: 0, privacyOrSafetyRegression: false };

test("rollout continues at or below every locked threshold", () => {
    assert.deepEqual(evaluateMatchmakerRolloutGuardrails(healthy), { shouldPause: false, reasons: [] });
});

test("any quota, repeat, error, state, or safety breach pauses rollout", () => {
    for (const breach of [
        { currentApiErrorRatePct: 3.1 },
        { repeatedCandidateRatePct: 1.1 },
        { creditMismatchCount: 1 },
        { unrecoverableStateCount: 1 },
        { privacyOrSafetyRegression: true },
    ]) {
        assert.equal(evaluateMatchmakerRolloutGuardrails({ ...healthy, ...breach }).shouldPause, true);
    }
});
