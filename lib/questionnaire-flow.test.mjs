import assert from 'node:assert/strict';
import test from 'node:test';

import { batchNumber, batchProgress, isBatchMilestone, isUsableDraft, nextQuestion } from './questionnaire-flow.ts';

const state = { answerCount: 0, required: 20, complete: false, revision: 2, birthDate: null, preferences: null, skipped: ['q001:1'] };
const question = (id, sensitive = false, answered = false) => ({
  id, question_key: id.split(':')[0], version: 1, prompt: id, category: 'values',
  pool: sensitive ? 'sensitive' : 'starter', sensitive, options: [], answer_id: answered ? '0' : null,
  acceptable: null, weight: null, public: null, explanation: null,
});

test('four batches expose five-question progress', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 19].map(batchNumber), [1, 1, 2, 2, 3, 3, 4, 4]);
  assert.equal(batchProgress(13), 3);
  assert.equal(isBatchMilestone(5), true);
  assert.equal(isBatchMilestone(20), false);
});

test('starter flow replaces skips and avoids sensitive questions', () => {
  const questions = [question('q001:1'), question('q002:1', true), question('q003:1')];
  assert.equal(nextQuestion(questions, state)?.id, 'q003:1');
  assert.equal(nextQuestion(questions, { ...state, answerCount: 20 }, true)?.id, 'q001:1');
});

test('drafts are account, question, and revision scoped', () => {
  const draft = { userId: 'a', questionId: 'q001:1', revision: 2, answer: '0', acceptable: ['0'], weight: 10, visible: false, explanation: '' };
  assert.equal(isUsableDraft(draft, { userId: 'a', questionId: 'q001:1', revision: 2 }), true);
  assert.equal(isUsableDraft(draft, { userId: 'b', questionId: 'q001:1', revision: 2 }), false);
  assert.equal(isUsableDraft(draft, { userId: 'a', questionId: 'q001:1', revision: 3 }), false);
});
