import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch, isApiError } from '@/lib/api-client';
import type {
  MatchmakerBrief,
  MatchmakerBriefMutationInput,
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

export function useMatchmakerConversation(enabled = true) {
  return useQuery({
    queryKey: ['matchmaker', 'conversation'],
    queryFn: async () => {
      const response = await apiFetch<{ data: MatchmakerConversationResponse } | MatchmakerConversationResponse>(
        '/api/matchmaker/session',
      );
      return unwrapData(response);
    },
    staleTime: 30_000,
    enabled,
  });
}

/**
 * Phase 1 data hook. Keep disabled until the Phase 2 brief routes and UI are enabled.
 */
export function useMatchmakerBrief(enabled = false) {
  return useQuery({
    queryKey: ['matchmaker', 'brief'],
    queryFn: async () => {
      const response = await apiFetch<{ data: MatchmakerBrief } | MatchmakerBrief>(
        '/api/matchmaker/brief',
      );
      return unwrapData(response);
    },
    staleTime: 30_000,
    enabled,
  });
}

export function useUpdateMatchmakerBrief() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['matchmaker', 'brief', 'update'],
    mutationFn: async (payload: MatchmakerBriefMutationInput) => {
      const response = await apiFetch<{ data: MatchmakerBrief } | MatchmakerBrief>(
        '/api/matchmaker/brief',
        {
          method: 'PATCH',
          body: {
            baseVersion: payload.baseVersion,
            operations: payload.operations,
          },
          timeoutMs: 20_000,
        },
      );
      return unwrapData(response);
    },
    onSuccess: (brief) => {
      queryClient.setQueryData(['matchmaker', 'brief'], brief);
    },
    onError: (error) => {
      if (!isApiError(error) || error.status !== 409 || !error.body || typeof error.body !== 'object') return;
      const latest = (error.body as { data?: MatchmakerBrief }).data;
      if (latest) queryClient.setQueryData(['matchmaker', 'brief'], latest);
    },
  });
}

export function useUndoMatchmakerBriefChange() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['matchmaker', 'brief', 'undo'],
    mutationFn: async (changeId: string) => {
      const response = await apiFetch<{ data: MatchmakerBrief } | MatchmakerBrief>(
        '/api/matchmaker/brief/undo',
        {
          method: 'POST',
          body: { changeId },
          timeoutMs: 20_000,
        },
      );
      return unwrapData(response);
    },
    onSuccess: (brief) => {
      queryClient.setQueryData(['matchmaker', 'brief'], brief);
    },
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
      queryClient.invalidateQueries({ queryKey: ['matchmaker', 'brief'] });
    },
  });
}

export function useFindNextMatchmakerCandidate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['matchmaker', 'conversation', 'search'],
    mutationFn: async () => {
      const response = await apiFetch<{ data: MatchmakerConversationResponse } | MatchmakerConversationResponse>(
        '/api/matchmaker/session/search',
        {
          method: 'POST',
          timeoutMs: 30_000,
        },
      );
      return unwrapData(response);
    },
    onSuccess: (conversation) => {
      queryClient.setQueryData(['matchmaker', 'conversation'], conversation);
    },
  });
}

export function useSubmitMatchmakerFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ['matchmaker', 'conversation', 'feedback'],
    mutationFn: async (payload: {
      outcome?: 'interested' | 'passed' | 'not_this_one' | 'refinement';
      reason?: string;
      candidateUserId?: string;
    }) => {
      const response = await apiFetch<{ data: MatchmakerConversationResponse } | MatchmakerConversationResponse>(
        '/api/matchmaker/session/feedback',
        {
          method: 'POST',
          body: payload,
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
