import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api-client';
import { getCurrentUserId } from '@/lib/auth-helpers';

export type Experience = { collection: boolean; matching: boolean; shell: boolean };
export type Compatibility = { status: 'ready' | 'insufficient_evidence'; score: number | null; sharedCount: number; evidenceCount: number };
export type Person = { id: string; name: string; age: number; gender: string; city: string; bio: string; photos: string[]; intentions: string[]; compatibility?: Compatibility };
export type Preferences = { genders: string[]; minAge: number; maxAge: number; city: string; radiusKm: number | null; latitude: number | null; longitude: number | null; intentions: string[] };
export type QuestionnaireState = { answerCount: number; required: number; complete: boolean; revision: number; birthDate: string | null; preferences: Preferences | null; skipped: string[] };
export type Question = {
  id: string;
  question_key: string;
  version: number;
  prompt: string;
  category: string;
  pool: 'starter' | 'replacement' | 'sensitive';
  sensitive: boolean;
  options: { id: string; label: string }[];
  answer_id: string | null;
  acceptable: string[] | null;
  weight: number | null;
  public: boolean | null;
  explanation: string | null;
};

const prefix = '/api/v2/questionnaire/';

export function useIdentity() {
  return useQuery({ queryKey: ['questionnaire-identity'], queryFn: getCurrentUserId, staleTime: 0 });
}

export function useQuestionnaire<T>(resource: string, enabled = true) {
  const identity = useIdentity();
  return useQuery({
    queryKey: ['questionnaire', identity.data, resource],
    queryFn: () => apiFetch<T>(prefix + resource),
    enabled: enabled && Boolean(identity.data),
    retry: false,
    staleTime: 10_000,
  });
}

export function useExperience() {
  return useQuestionnaire<Experience>('experience');
}

export function useQuestionnaireMutation<T = unknown>(resource: string, method = 'POST') {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Record<string, unknown>) => apiFetch<T>(prefix + resource, { method, body }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questionnaire'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
      ]);
    },
  });
}

export function compatibilityLabel(compatibility?: Compatibility) {
  return compatibility?.score != null
    ? `${Math.round(compatibility.score)}% compatible · ${compatibility.sharedCount} shared answers`
    : 'Answer more questions to compare';
}
