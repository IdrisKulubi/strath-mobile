/**
 * Client-side constants for the vibe-check / post-call decision flow.
 *
 * Kept in a single module so the call screen, decision UI, and Dates "finish your decision"
 * modal share one source of truth. The matching server-side env var
 * `VIBE_CHECK_PARTNER_DECISION_TIMEOUT_SECONDS` (default 60) is only consulted by server code;
 * we expose `EXPO_PUBLIC_PARTNER_DECISION_TIMEOUT_SECONDS` for any deploy where ops wants to
 * tune the client-side wait without rebuilding.
 */

const DEFAULT_PARTNER_DECISION_TIMEOUT_SECONDS = 60;

function readPositiveInt(raw: string | undefined, fallback: number): number {
    const parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

export const PARTNER_DECISION_TIMEOUT_SECONDS = readPositiveInt(
    process.env.EXPO_PUBLIC_PARTNER_DECISION_TIMEOUT_SECONDS,
    DEFAULT_PARTNER_DECISION_TIMEOUT_SECONDS,
);
