import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export type PublicFeatureFlags = {
    paymentsEnabled?: boolean;
    matchmakerPersonalizationV2?: boolean;
};

export async function fetchPublicFeatureFlags(): Promise<PublicFeatureFlags> {
    const json = await apiFetch<{ data?: PublicFeatureFlags } | PublicFeatureFlags>('/api/public/feature-flags');
    return json && typeof json === 'object' && 'data' in json
        ? json.data ?? { paymentsEnabled: false }
        : (json as PublicFeatureFlags | null) ?? { paymentsEnabled: false };
}

export function usePublicFeatureFlags() {
    return useQuery({
        queryKey: ['publicFeatureFlags'],
        queryFn: fetchPublicFeatureFlags,
        staleTime: 60_000,
        refetchOnMount: 'always',
    });
}

export function usePaymentsEnabled() {
    const query = usePublicFeatureFlags();

    return {
        paymentsEnabled: Boolean(query.data?.paymentsEnabled),
        isLoading: query.isLoading,
    };
}
