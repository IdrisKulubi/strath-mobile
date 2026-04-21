import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';

/**
 * Mirror of `getPublicFeatureFlags()` on the server. Keep in sync with
 * `backend/strath-backend/src/lib/feature-flags.ts`.
 */
export interface PublicFeatureFlags {
    demoLoginEnabled: boolean;
    paymentsEnabled: boolean;
}

const DEFAULT_FLAGS: PublicFeatureFlags = {
    demoLoginEnabled: false,
    paymentsEnabled: false,
};

interface FeatureFlagsEnvelope {
    data?: Partial<PublicFeatureFlags>;
    success?: boolean;
}

async function fetchPublicFeatureFlags(): Promise<PublicFeatureFlags> {
    try {
        const payload = await apiFetch<FeatureFlagsEnvelope>('/api/public/feature-flags', {
            skipAuth: true,
            timeoutMs: 8_000,
        });
        const data = payload?.data ?? {};
        return {
            demoLoginEnabled: Boolean(data.demoLoginEnabled),
            paymentsEnabled: Boolean(data.paymentsEnabled),
        };
    } catch {
        // Network failures fall back to the conservative default (all flags off).
        // Never throw from a feature-flag fetch — the app should degrade gracefully.
        return DEFAULT_FLAGS;
    }
}

/**
 * Shared feature-flag hook backed by React Query. Returns flags + a loading
 * signal; `data` is always defined (never undefined) so callers don't need a
 * noisy `?? false` everywhere.
 *
 * Flags are considered cheap + boolean — we cache aggressively (15 min stale
 * time) and refetch on focus so admins flipping a flag see reasonably fast
 * propagation to devices already signed in.
 */
export function useFeatureFlags() {
    const query = useQuery<PublicFeatureFlags>({
        queryKey: ['public-feature-flags'],
        queryFn: fetchPublicFeatureFlags,
        staleTime: 15 * 60 * 1000,
        gcTime: 60 * 60 * 1000,
        refetchOnWindowFocus: true,
        placeholderData: DEFAULT_FLAGS,
    });

    return {
        flags: query.data ?? DEFAULT_FLAGS,
        isLoading: query.isLoading,
        refetch: query.refetch,
    };
}
