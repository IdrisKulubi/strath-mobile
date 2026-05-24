import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api-client';

export type PreferenceMode =
  | 'similar_to_me'
  | 'different_from_me'
  | 'surprise_me'
  | 'active_only'
  | 'serious_matches';

export type MatchType =
  | 'similarity'
  | 'complementary'
  | 'discovery'
  | 'high_activity'
  | 'admin_curated';

export type RecommendationSource =
  | 'daily_recommendations'
  | 'admin_curated'
  | 'available_now';

export type RecommendationDecision = 'open_to_meet' | 'passed';
export type CurrentRecommendationDecision = 'pending' | RecommendationDecision;

export interface MatchPreferences {
  id: string;
  userId: string;
  preferenceMode: PreferenceMode;
  availableNow: boolean;
  availableToday: boolean;
  openToCalls: boolean;
  preferredAgeMin?: number | null;
  preferredAgeMax?: number | null;
  preferredUniversities: string[];
  preferredContactWindow?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RecommendationProfilePreview {
  firstName: string;
  age: number | null;
  university: string | null;
  course: string | null;
  photos: string[];
  profilePhoto?: string | null;
  bio?: string | null;
  interests: string[];
}

export interface RankedRecommendation {
  candidateUserId: string;
  currentUserDecision: CurrentRecommendationDecision;
  finalScore: number;
  matchType: MatchType;
  compatibilityScore: number;
  activityScore: number;
  responseScore: number;
  availabilityScore: number;
  diversityScore: number;
  mutualProbabilityScore: number;
  preferenceFitScore: number;
  profileQualityScore: number;
  reason: string;
  reasons: string[];
  activityStatus: 'active_now' | 'active_today' | 'active_recently' | 'inactive';
  profilePreview: RecommendationProfilePreview;
}

export interface DailyRecommendationsResponse {
  userId: string;
  generatedAt: string;
  preferenceMode: PreferenceMode;
  mode: 'recommendations' | 'hold';
  hold?: unknown;
  recommendations: RankedRecommendation[];
}

export interface RecommendationDecisionResponse {
  event: unknown;
  interest?: unknown;
  pair?: unknown | null;
  mutual?: { id?: string } | null;
  mutualMatchCreated?: boolean;
}

function unwrapData<T>(response: { data?: T } | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export function getMatchTypeLabel(matchType: MatchType) {
  switch (matchType) {
    case 'complementary':
      return 'Different but interesting';
    case 'discovery':
      return 'Something new';
    case 'high_activity':
      return 'Active today';
    case 'admin_curated':
      return 'Curated by StrathSpace';
    case 'similarity':
    default:
      return 'Similar vibe';
  }
}

export function getPreferenceLabel(mode: PreferenceMode) {
  switch (mode) {
    case 'similar_to_me':
      return 'Similar';
    case 'different_from_me':
      return 'Different';
    case 'active_only':
      return 'Active';
    case 'serious_matches':
      return 'Serious';
    case 'surprise_me':
    default:
      return 'Surprise';
  }
}

export function useMatchPreferences() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['matchPreferences'],
    queryFn: async () => {
      const response = await apiFetch<{ data: { preferences: MatchPreferences } }>('/api/match-preferences');
      return unwrapData(response).preferences;
    },
    staleTime: 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (payload: Partial<Pick<
      MatchPreferences,
      'preferenceMode' | 'availableNow' | 'availableToday' | 'openToCalls' | 'preferredAgeMin' | 'preferredAgeMax' | 'preferredUniversities' | 'preferredContactWindow'
    >>) => {
      const response = await apiFetch<{ data: { preferences: MatchPreferences } }>('/api/match-preferences', {
        method: 'POST',
        body: payload,
      });
      return unwrapData(response).preferences;
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData(['matchPreferences'], preferences);
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'daily'] });
    },
  });

  return {
    ...query,
    updatePreferences: mutation.mutate,
    updatePreferencesAsync: mutation.mutateAsync,
    isUpdatingPreferences: mutation.isPending,
  };
}

export function useDailyRecommendations() {
  return useQuery({
    queryKey: ['recommendations', 'daily'],
    queryFn: async () => {
      const response = await apiFetch<{ data: DailyRecommendationsResponse }>('/api/recommendations/daily');
      return unwrapData(response);
    },
    staleTime: 60 * 1000,
  });
}

export function useRecommendationEvent() {
  return useMutation({
    mutationFn: async (payload: {
      candidateUserId: string;
      source: RecommendationSource;
      matchType?: MatchType;
      event: 'shown' | 'viewed' | 'ignored';
      metadata?: Record<string, unknown>;
    }) => {
      const response = await apiFetch('/api/recommendation-events', {
        method: 'POST',
        body: payload,
      });
      return response;
    },
  });
}

export function useRecommendationDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      candidateUserId: string;
      decision: RecommendationDecision;
      source: RecommendationSource;
      matchType?: MatchType;
    }) => {
      const response = await apiFetch<{ data: RecommendationDecisionResponse } | RecommendationDecisionResponse>('/api/recommendation-decisions', {
        method: 'POST',
        body: payload,
      });
      return { result: unwrapData(response), payload };
    },
    onSuccess: (_, { candidateUserId }) => {
      queryClient.invalidateQueries({ queryKey: ['recommendations', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['candidatePairs', 'daily'] });
      queryClient.invalidateQueries({ queryKey: ['mutualDates'] });
      queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
      queryClient.invalidateQueries({ queryKey: ['userProfile', candidateUserId] });
    },
  });
}
