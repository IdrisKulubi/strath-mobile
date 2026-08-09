import AsyncStorage from '@react-native-async-storage/async-storage';

import type { MatchmakerFeedbackReasonCode } from '@/types/matchmaker';

export interface MatchmakerFeedbackDraft {
  submissionId: string;
  reasonCode: MatchmakerFeedbackReasonCode | null;
  detail: string;
  learningScope: 'candidate_only' | 'future_matches' | null;
  detailConfirmed: boolean;
}

export function createMatchmakerFeedbackDraft(): MatchmakerFeedbackDraft {
  return {
    submissionId: `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    reasonCode: null,
    detail: '',
    learningScope: null,
    detailConfirmed: false,
  };
}

const key = (shortlistId: string | undefined, candidateUserId: string) => (
  shortlistId
    ? `matchmaker:feedback:v2:${shortlistId}:${candidateUserId}`
    : `matchmaker:feedback:v2:profile:${candidateUserId}`
);

export async function loadMatchmakerFeedbackDraft(shortlistId: string | undefined, candidateUserId: string) {
  const raw = await AsyncStorage.getItem(key(shortlistId, candidateUserId));
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<MatchmakerFeedbackDraft>;
    return typeof draft.submissionId === 'string'
      ? draft as MatchmakerFeedbackDraft
      : { ...createMatchmakerFeedbackDraft(), ...draft };
  } catch {
    return null;
  }
}

export function saveMatchmakerFeedbackDraft(shortlistId: string | undefined, candidateUserId: string, draft: MatchmakerFeedbackDraft) {
  return AsyncStorage.setItem(key(shortlistId, candidateUserId), JSON.stringify(draft));
}

export function clearMatchmakerFeedbackDraft(shortlistId: string | undefined, candidateUserId: string) {
  return AsyncStorage.removeItem(key(shortlistId, candidateUserId));
}
