import type { Question, QuestionnaireState } from './questionnaire';

export const QUESTIONS_PER_BATCH = 5;
export const ONBOARDING_ANSWER_TARGET = 32;
export const QUESTION_BEAT_COUNT = 4;
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
  return Math.min(Math.ceil(ONBOARDING_ANSWER_TARGET / QUESTIONS_PER_BATCH), Math.floor(Math.min(answerCount, ONBOARDING_ANSWER_TARGET - 1) / QUESTIONS_PER_BATCH) + 1);
}

export function batchProgress(answerCount: number) {
  if (answerCount >= ONBOARDING_ANSWER_TARGET) return QUESTIONS_PER_BATCH;
  return answerCount % QUESTIONS_PER_BATCH;
}

export function nextQuestion(questions: Question[], state: QuestionnaireState) {
  const skipped = new Set(state.skipped);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const requiredIds = state.requiredQuestionIds ?? questions.filter((question) => !question.sensitive).slice(0, state.required).map((question) => question.id);
  const required = requiredIds.map((id) => byId.get(id)).filter((question): question is Question => Boolean(question && !question.answer_id));
  if (!state.complete) return required.find((question) => !skipped.has(question.id)) ?? required[0] ?? null;
  const superseded = new Set(['q083:1', 'q084:1', 'q085:1', 'q086:1', 'q087:1', 'q088:1', 'q100:1']);
  const eligible = questions.filter((question) => !question.answer_id && !superseded.has(question.id));
  return eligible.find((question) => !skipped.has(question.id)) ?? eligible[0] ?? null;
}

export function isBatchMilestone(answerCount: number) {
  return answerCount > 0 && answerCount < ONBOARDING_ANSWER_TARGET && answerCount % QUESTIONS_PER_BATCH === 0;
}

export type StoredQuestionDraft = {
  userId: string;
  questionId: string;
  revision: number;
  answer: string;
  acceptable: string[];
  weight: number;
  /** Kept only to restore drafts written before the public-answer flow. */
  visible?: boolean;
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
    && (draft.visible === undefined || typeof draft.visible === 'boolean')
    && typeof draft.explanation === 'string'
    && draft.explanation.length <= EXPLANATION_MAX_LENGTH
    && (draft.beat === undefined || (Number.isInteger(draft.beat) && draft.beat >= 0 && draft.beat <= QUESTION_BEAT_COUNT))
    && (draft.weightChosen === undefined || typeof draft.weightChosen === 'boolean')
    && (draft.visibilityChosen === undefined || typeof draft.visibilityChosen === 'boolean')
    && (draft.beat === undefined || draft.beat === 0 || Boolean(draft.answer))
    && (draft.beat === undefined || draft.beat < 2 || draft.acceptable.length > 0)
    && (!expected.optionIds || (
      (!draft.answer || expected.optionIds.includes(draft.answer))
      && draft.acceptable.every((id) => expected.optionIds!.includes(id))
    ));
}
