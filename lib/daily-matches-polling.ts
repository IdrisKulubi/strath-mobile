export interface DailyMatchesPollInput {
    mode: 'matches' | 'hold' | 'manual_curation';
    matches?: Array<{ expiresAt: string }>;
    hold?: { autoReleaseAt?: string | null } | null;
}

export const MIN_DAILY_MATCHES_POLL_MS = 30_000;

export function getDailyMatchesPollInterval(data: DailyMatchesPollInput | undefined) {
    if (!data) return false;
    if (data.mode === 'hold' && data.hold?.autoReleaseAt) {
        const ms = new Date(data.hold.autoReleaseAt).getTime() - Date.now();
        return ms > 0 ? Math.max(MIN_DAILY_MATCHES_POLL_MS, ms) : MIN_DAILY_MATCHES_POLL_MS;
    }
    if (data.mode === 'manual_curation') return MIN_DAILY_MATCHES_POLL_MS;
    const matches = data.matches ?? [];
    if (matches.length === 0) return 60_000;
    const soonestMs = Math.min(...matches.map((m) => new Date(m.expiresAt).getTime()));
    const msUntilExpiry = soonestMs - Date.now();
    if (msUntilExpiry <= 0) return MIN_DAILY_MATCHES_POLL_MS;
    return Math.max(MIN_DAILY_MATCHES_POLL_MS, msUntilExpiry);
}
