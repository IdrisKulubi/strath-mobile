import type { Question, QuestionnaireState } from './questionnaire';

export const QUESTIONS_PER_BATCH = 5;
export const ONBOARDING_ANSWER_TARGET = 20;
export const QUESTION_BEAT_COUNT = 5;
export const EXPLANATION_MAX_LENGTH = 500;
export const IMPORTANCE_CHOICES = [
  { value: 0, label: 'Not a big deal', description: 'I’m flexible about this' },
  { value: 1, label: 'A little important', description: 'A small preference' },
  { value: 10, label: 'Somewhat important', description: 'I’d like us to be aligned' },
  { value: 50, label: 'Very important', description: 'This matters a lot to me' },
  { value: 250, label: 'Dealbreaker', description: 'This is essential for me' },
] as const;
export const IMPORTANCE_VALUES: readonly number[] = IMPORTANCE_CHOICES.map((choice) => choice.value);

/** Synchronous lock for taps that can arrive before React renders the next beat or loading state. */
export function createInteractionGate() {
  let locked = false;
  return {
    tryEnter() {
      if (locked) return false;
      locked = true;
      return true;
    },
    reset() { locked = false; },
  };
}

export function selectOwnAnswer(optionId: string, acceptable: string[]) {
  return { answer: optionId, acceptable: acceptable.includes(optionId) ? acceptable : [...acceptable, optionId] };
}

export function toggleAcceptable(optionId: string, ownAnswer: string, acceptable: string[]) {
  if (optionId === ownAnswer) return acceptable;
  return acceptable.includes(optionId) ? acceptable.filter((id) => id !== optionId) : [...acceptable, optionId];
}

export function toggleAllAcceptable(optionIds: string[], ownAnswer: string, acceptable: string[]) {
  return optionIds.every((id) => acceptable.includes(id)) ? [ownAnswer] : [...optionIds];
}

export function isCompleteQuestionDraft(optionIds: string[], answer: string, acceptable: string[], weight: number, explanation: string) {
  const allowed = new Set(optionIds);
  return allowed.has(answer) && acceptable.length > 0 && acceptable.includes(answer)
    && acceptable.length <= allowed.size && acceptable.every((id) => allowed.has(id))
    && new Set(acceptable).size === acceptable.length
    && IMPORTANCE_VALUES.includes(weight) && explanation.trim().length <= EXPLANATION_MAX_LENGTH;
}

export function batchNumber(answerCount: number) {
  return Math.min(4, Math.floor(Math.min(answerCount, ONBOARDING_ANSWER_TARGET - 1) / QUESTIONS_PER_BATCH) + 1);
}

export function batchProgress(answerCount: number) {
  if (answerCount >= ONBOARDING_ANSWER_TARGET) return QUESTIONS_PER_BATCH;
  return answerCount % QUESTIONS_PER_BATCH;
}

export function nextQuestion(questions: Question[], state: QuestionnaireState, includeSkipped = false) {
  const skipped = new Set(state.skipped);
  return questions.find((question) => {
    if (question.answer_id) return false;
    if (!includeSkipped && skipped.has(question.id)) return false;
    if (state.answerCount < ONBOARDING_ANSWER_TARGET && question.sensitive) return false;
    return true;
  }) ?? null;
}

export function isBatchMilestone(answerCount: number) {
  return answerCount > 0 && answerCount < ONBOARDING_ANSWER_TARGET && answerCount % QUESTIONS_PER_BATCH === 0;
}

export function shouldPauseAfterAnswer(answerCount: number, didSave: boolean, previousCount: number) {
  return didSave && answerCount > previousCount && isBatchMilestone(answerCount);
}

export type StoredQuestionDraft = {
  userId: string;
  questionId: string;
  revision: number;
  answer: string;
  acceptable: string[];
  weight: number;
  visible: boolean;
  explanation: string;
  beat?: number;
  weightChosen?: boolean;
  visibilityChosen?: boolean;
};

export function isUsableDraft(value: unknown, expected: Pick<StoredQuestionDraft, 'userId' | 'questionId' | 'revision'> & { optionIds?: string[] }): value is StoredQuestionDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<StoredQuestionDraft>;
  return draft.userId === expected.userId
    && draft.questionId === expected.questionId
    && draft.revision === expected.revision
    && typeof draft.answer === 'string'
    && Array.isArray(draft.acceptable)
    && draft.acceptable.every((item) => typeof item === 'string')
    && typeof draft.weight === 'number'
    && IMPORTANCE_VALUES.includes(draft.weight)
    && typeof draft.visible === 'boolean'
    && typeof draft.explanation === 'string'
    && draft.explanation.length <= EXPLANATION_MAX_LENGTH
    && (draft.beat === undefined || (Number.isInteger(draft.beat) && draft.beat >= 0 && draft.beat < QUESTION_BEAT_COUNT))
    && (draft.weightChosen === undefined || typeof draft.weightChosen === 'boolean')
    && (draft.visibilityChosen === undefined || typeof draft.visibilityChosen === 'boolean')
    && (draft.beat === undefined || draft.beat === 0 || Boolean(draft.answer))
    && (draft.beat === undefined || draft.beat < 2 || draft.acceptable.length > 0)
    && (!expected.optionIds || (
      (!draft.answer || expected.optionIds.includes(draft.answer))
      && draft.acceptable.every((id) => expected.optionIds!.includes(id))
    ));
}
