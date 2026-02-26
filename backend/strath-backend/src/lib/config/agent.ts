const DEFAULT_AGENT_DAILY_SEARCH_LIMIT = 10;

function parsePositiveInt(value: string | undefined, fallback: number) {
    if (!value) return fallback;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

export const AGENT_DAILY_SEARCH_LIMIT = parsePositiveInt(
    process.env.AGENT_DAILY_SEARCH_LIMIT,
    DEFAULT_AGENT_DAILY_SEARCH_LIMIT,
);
