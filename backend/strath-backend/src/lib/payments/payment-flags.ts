import { APP_FEATURE_KEYS, isFeatureEnabled } from "@/lib/feature-flags";

const CACHE_TTL_MS = 30_000;

let cachedEnabled: boolean | null = null;
let cachedAt = 0;

/** Cached read of `payments_enabled` to avoid hammering the DB in hot paths. */
export async function getPaymentsEnabled(): Promise<boolean> {
    const now = Date.now();
    if (cachedEnabled !== null && now - cachedAt < CACHE_TTL_MS) {
        return cachedEnabled;
    }

    cachedEnabled = await isFeatureEnabled(APP_FEATURE_KEYS.paymentsEnabled, false);
    cachedAt = now;
    return cachedEnabled;
}

/** Test-only: reset in-memory cache between tests. */
export function resetPaymentsEnabledCacheForTests(): void {
    cachedEnabled = null;
    cachedAt = 0;
}
