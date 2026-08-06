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

const key = (shortlistId: string, candidateUserId: string) => `matchmaker:feedback:v2:${shortlistId}:${candidateUserId}`;

export async function loadMatchmakerFeedbackDraft(shortlistId: string, candidateUserId: string) {
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

export function saveMatchmakerFeedbackDraft(shortlistId: string, candidateUserId: string, draft: MatchmakerFeedbackDraft) {
  return AsyncStorage.setItem(key(shortlistId, candidateUserId), JSON.stringify(draft));
}

export function clearMatchmakerFeedbackDraft(shortlistId: string, candidateUserId: string) {
  return AsyncStorage.removeItem(key(shortlistId, candidateUserId));
}
