import type { Question, QuestionnaireState } from './questionnaire';

export const QUESTIONS_PER_BATCH = 5;
export const ONBOARDING_ANSWER_TARGET = 20;

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

export type StoredQuestionDraft = {
  userId: string;
  questionId: string;
  revision: number;
  answer: string;
  acceptable: string[];
  weight: number;
  visible: boolean;
  explanation: string;
};

export function isUsableDraft(value: unknown, expected: Pick<StoredQuestionDraft, 'userId' | 'questionId' | 'revision'>): value is StoredQuestionDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<StoredQuestionDraft>;
  return draft.userId === expected.userId
    && draft.questionId === expected.questionId
    && draft.revision === expected.revision
    && typeof draft.answer === 'string'
    && Array.isArray(draft.acceptable)
    && draft.acceptable.every((item) => typeof item === 'string')
    && typeof draft.weight === 'number'
    && typeof draft.visible === 'boolean'
    && typeof draft.explanation === 'string';
}
