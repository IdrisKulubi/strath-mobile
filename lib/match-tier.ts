/**
 * Qualitative match tier label shown to users in place of a raw compatibility
 * percentage. The underlying score is still computed server-side and used for
 * ranking / gating, but the UI only communicates the strength of the curation
 * in human terms.
 *
 * Tiers are aligned with the gating thresholds in `candidate-pairs-service`:
 * - `MIN_CANDIDATE_MATCH_SCORE` = 72 (floor for anything the user sees)
 * - Scores below 72 should never reach the UI, but we still include a safe
 *   fallback label just in case.
 */
export interface MatchTier {
    id: "strong" | "curated" | "good" | "fallback";
    label: string;
    /** Optional one-line helper copy for larger cards. */
    helper: string;
}

export function getMatchTier(score: number): MatchTier {
    if (score >= 90) {
        return {
            id: "strong",
            label: "Strong vibe match",
            helper: "A standout curated pick for today",
        };
    }
    if (score >= 80) {
        return {
            id: "curated",
            label: "Curated pick for today",
            helper: "A thoughtfully chosen match for you",
        };
    }
    if (score >= 72) {
        return {
            id: "good",
            label: "A good fit for today",
            helper: "Handpicked based on what you share",
        };
    }
    return {
        id: "fallback",
        label: "Curated for you",
        helper: "A curated pick for today",
    };
}
