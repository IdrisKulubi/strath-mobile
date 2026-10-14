export interface MatchmakerRolloutHealth {
    baselineApiErrorRatePct: number;
    currentApiErrorRatePct: number;
    repeatedCandidateRatePct: number;
    creditMismatchCount: number;
    unrecoverableStateCount: number;
    privacyOrSafetyRegression: boolean;
}

export function evaluateMatchmakerRolloutGuardrails(input: MatchmakerRolloutHealth) {
    const reasons: string[] = [];
    if (input.currentApiErrorRatePct > input.baselineApiErrorRatePct + 2) {
        reasons.push("API error rate is more than two percentage points above the V1 baseline");
    }
    if (input.repeatedCandidateRatePct > 1) reasons.push("Repeated-candidate rate exceeds one percent");
    if (input.creditMismatchCount > 0) reasons.push("Persisted shortlist credit accounting is inconsistent");
    if (input.unrecoverableStateCount > 0) reasons.push("An unrecoverable matchmaker state was recorded");
    if (input.privacyOrSafetyRegression) reasons.push("A privacy or safety regression was reported");
    return { shouldPause: reasons.length > 0, reasons };
}
