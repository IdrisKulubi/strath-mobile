import { useQuery } from '@tanstack/react-query';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

type PublicFeatureFlags = {
    paymentsEnabled?: boolean;
};

async function fetchPublicFeatureFlags(): Promise<PublicFeatureFlags> {
    const res = await fetch(`${API_URL}/api/public/feature-flags`);
    if (!res.ok) {
        return { paymentsEnabled: false };
    }
    const json = await res.json();
    return json?.data ?? json ?? { paymentsEnabled: false };
}

export function usePaymentsEnabled() {
    const query = useQuery({
        queryKey: ['publicFeatureFlags'],
        queryFn: fetchPublicFeatureFlags,
        staleTime: 60_000,
    });

    return {
        paymentsEnabled: Boolean(query.data?.paymentsEnabled),
        isLoading: query.isLoading,
    };
}
