import { useQuery } from '@tanstack/react-query';
import { DiscoverService } from '@/lib/services/discover-service';
import { DiscoverSection } from '@/types/discover';
import { useProfile } from './use-profile';

interface UseDiscoverSectionsReturn {
    sections: DiscoverSection[];
    isLoading: boolean;
    isError: boolean;
    error: Error | null;
    refetch: () => Promise<any>;
    refreshAt?: string;
}

/**
 * useDiscoverSections - Hook for fetching organized discover sections
 * Provides clean data for the UI layer
 */
export function useDiscoverSections(): UseDiscoverSectionsReturn {
    const { data: userProfile } = useProfile();

    const {
        data,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery({
        queryKey: ['discover-sections'],
        queryFn: async () => {
            try {
                // Try to get pre-organized sections from backend
                return await DiscoverService.getSections();
            } catch {
                // Fallback: Build sections from raw profiles client-side
                const profiles = await DiscoverService.getRecommended(20);
                const sections = DiscoverService.buildSectionsFromProfiles(
                    profiles,
                    userProfile?.interests || []
                );
                return { sections, refreshAt: undefined };
            }
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes cache
        enabled: !!userProfile, // Only fetch when user profile is loaded
    });

    return {
        sections: data?.sections || [],
        isLoading,
        isError,
        error: error as Error | null,
        refetch,
        refreshAt: data?.refreshAt,
    };
}
