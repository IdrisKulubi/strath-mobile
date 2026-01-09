import { authClient } from '@/lib/auth-client';
import {
    DiscoverProfile,
    DiscoverSection,
    DiscoverSectionsResponseSchema
} from '@/types/discover';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

/**
 * DiscoverService - Clean abstraction for discovery API operations
 */
export const DiscoverService = {
    /**
     * Get pre-organized sections for the discover screen
     */
    async getSections(): Promise<{ sections: DiscoverSection[]; refreshAt?: string }> {
        const session = await authClient.getSession();
        const token = session.data?.session?.token;

        const response = await fetch(`${API_URL}/api/discover/sections`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch discover sections');
        }

        const result = await response.json();
        const data = result.data || result;

        return DiscoverSectionsResponseSchema.parse(data);
    },

    /**
     * Get raw recommended profiles (fallback for sections)
     */
    async getRecommended(limit: number = 10): Promise<DiscoverProfile[]> {
        const session = await authClient.getSession();
        const token = session.data?.session?.token;

        const response = await fetch(`${API_URL}/api/discover?limit=${limit}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : '',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Failed to fetch recommendations');
        }

        const result = await response.json();
        return (result.data?.profiles || result.profiles || []) as DiscoverProfile[];
    },

    /**
     * Build sections from raw profiles (client-side fallback)
     * Used when backend sections endpoint is not available
     */
    buildSectionsFromProfiles(
        profiles: DiscoverProfile[],
        userInterests: string[] = []
    ): DiscoverSection[] {
        // Calculate shared interests for each profile
        const withShared = profiles.map(p => ({
            ...p,
            sharedInterests: (p.interests || []).filter(i => userInterests.includes(i)).length
        }));

        // Sort by shared interests for "similar interests" section
        const sortedBySimilar = [...withShared].sort((a, b) =>
            (b.sharedInterests || 0) - (a.sharedInterests || 0)
        );

        // Sort by score for recommendations
        const sortedByScore = [...withShared].sort((a, b) =>
            (b.score || 0) - (a.score || 0)
        );

        const sections: DiscoverSection[] = [];

        // Recommended section (top scored)
        if (sortedByScore.length > 0) {
            sections.push({
                id: 'recommended',
                title: 'Recommended for you',
                subtitle: 'Based on your profile and interests',
                type: 'featured',
                profiles: sortedByScore.slice(0, 5),
            });
        }

        // Similar interests section
        const similarProfiles = sortedBySimilar.filter(p => (p.sharedInterests || 0) > 0);
        if (similarProfiles.length > 0) {
            sections.push({
                id: 'similar',
                title: 'Similar interests',
                type: 'horizontal',
                profiles: similarProfiles.slice(0, 8),
            });
        }

        // Nearby section (same university)
        const sameUni = withShared.filter(p => p.university);
        if (sameUni.length > 0) {
            sections.push({
                id: 'nearby',
                title: 'From your campus',
                type: 'horizontal',
                profiles: sameUni.slice(0, 6),
            });
        }

        return sections;
    },
};
