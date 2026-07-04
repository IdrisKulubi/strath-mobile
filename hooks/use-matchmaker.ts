import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import type {
  MatchmakerConversationResponse,
  MatchmakerSearchResponse,
} from '@/types/matchmaker';

interface MatchmakerSearchPayload {
  intent: string;
  limit?: number;
  excludeUserIds?: string[];
}

function unwrapData<T>(response: { data?: T } | T): T {
  if (response && typeof response === 'object' && 'data' in response) {
    return (response as { data: T }).data;
  }
  return response as T;
}

export function useMatchmakerSearch() {
  return useMutation({
    mutationKey: ['matchmaker', 'search'],
    mutationFn: async (payload: MatchmakerSearchPayload) => {
      const response = await apiFetch<{ data: MatchmakerSearchResponse } | MatchmakerSearchResponse>(
        '/api/matchmaker/search',
        {
          method: 'POST',
          body: {
            limit: 5,
            ...payload,
          },
          timeoutMs: 30_000,
        },
      );

      return unwrapData(response);
    },
  });
}

export function useMatchmakerConversation() {
  return useQuery({
    queryKey: ['matchmaker', 'conversation'],
    queryFn: async () => {
      const response = await apiFetch<{ data: MatchmakerConversationResponse } | MatchmakerConversationResponse>(
        '/api/matchmaker/session',
      );
      return unwrapData(response);
    },
    staleTime: 30_000,
  });
}

export function useSendMatchmakerMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['matchmaker', 'conversation', 'message'],
    mutationFn: async (text: string) => {
      const response = await apiFetch<{ data: MatchmakerConversationResponse } | MatchmakerConversationResponse>(
        '/api/matchmaker/session/messages',
        {
          method: 'POST',
          body: { text },
          timeoutMs: 20_000,
        },
      );
      return unwrapData(response);
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(['matchmaker', 'conversation'], conversation);
    },
  });
}
