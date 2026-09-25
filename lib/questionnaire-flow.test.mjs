import assert from 'node:assert/strict';
import test from 'node:test';

import { batchNumber, batchProgress, createInteractionGate, IMPORTANCE_CHOICES, isBatchMilestone, isCompleteQuestionDraft, isUsableDraft, nextQuestion, QUESTION_BEAT_COUNT, selectOwnAnswer, toggleAcceptable, toggleAllAcceptable } from './questionnaire-flow.ts';

const state = { answerCount: 0, required: 32, requiredQuestionIds: ['q001:1', 'q003:1', 'q002:1'], complete: false, revision: 2, birthDate: null, preferences: null, skipped: ['q001:1'] };
const question = (id, sensitive = false, answered = false) => ({
  id, question_key: id.split(':')[0], version: 1, prompt: id, category: 'values',
  pool: sensitive ? 'sensitive' : 'starter', sensitive, neutral_answer_id: null, options: [], answer_id: answered ? '0' : null,
  acceptable: null, weight: null, public: null, explanation: null,
});

test('seven progress segments cover all thirty-two required questions', () => {
  assert.deepEqual([0, 4, 5, 9, 10, 14, 15, 19, 20, 29, 30, 31].map(batchNumber), [1, 1, 2, 2, 3, 3, 4, 4, 5, 6, 7, 7]);
  assert.equal(batchProgress(13), 3);
  assert.equal(isBatchMilestone(5), true);
  assert.equal(isBatchMilestone(20), true);
  assert.equal(isBatchMilestone(32), false);
});

test('starter flow returns to previously skipped questions before completion', () => {
  const questions = [question('q001:1'), question('q002:1', true), question('q003:1')];
  assert.equal(nextQuestion(questions, state)?.id, 'q003:1');
  assert.equal(nextQuestion([question('q001:1'), question('q002:1', true)], state)?.id, 'q002:1');
  assert.equal(nextQuestion([question('q001:1')], state)?.id, 'q001:1');
  assert.equal(nextQuestion(questions, { ...state, answerCount: 20 })?.id, 'q003:1');
  assert.equal(nextQuestion(questions, { ...state, answerCount: 32, complete: true })?.id, 'q002:1');
});

test('the required sequence resumes at question twenty-one before unrelated optional questions', () => {
  const requiredQuestionIds = ['q001:1', 'q101:1', 'q083:2'];
  const questions = [question('q001:1', false, true), question('q021:1'), question('q101:1', true), question('q083:2', true)];
  assert.equal(nextQuestion(questions, { ...state, requiredQuestionIds, answerCount: 20, skipped: [] })?.id, 'q101:1');
  assert.equal(nextQuestion(questions, { ...state, requiredQuestionIds, answerCount: 21, skipped: [] })?.id, 'q101:1');
});

test('drafts are account, question, and revision scoped', () => {
  const draft = { userId: 'a', questionId: 'q001:1', revision: 2, answer: '0', acceptable: ['0'], weight: 10, visible: false, explanation: '' };
  assert.equal(isUsableDraft(draft, { userId: 'a', questionId: 'q001:1', revision: 2 }), true);
  assert.equal(isUsableDraft(draft, { userId: 'b', questionId: 'q001:1', revision: 2 }), false);
  assert.equal(isUsableDraft(draft, { userId: 'a', questionId: 'q001:1', revision: 3 }), false);
  assert.equal(isUsableDraft({ ...draft, answer: 'removed' }, { userId: 'a', questionId: 'q001:1', revision: 2, optionIds: ['0', '1'] }), false);
  assert.equal(isUsableDraft({ ...draft, beat: 5 }, { userId: 'a', questionId: 'q001:1', revision: 2 }), false);
});

test('own choice stays acceptable and select-all reverses without invented option IDs', () => {
  const choices = ['throughout', 'daily', 'sometimes'];
  const first = selectOwnAnswer('throughout', []);
  assert.deepEqual(first, { answer: 'throughout', acceptable: ['throughout'] });
  const all = toggleAllAcceptable(choices, first.answer, first.acceptable);
  assert.deepEqual(all, choices);
  assert.deepEqual(toggleAllAcceptable(choices, first.answer, all), ['throughout']);
  assert.deepEqual(toggleAcceptable('throughout', first.answer, all), all);
  assert.deepEqual(toggleAcceptable('daily', first.answer, all), ['throughout', 'sometimes']);
  assert.deepEqual(selectOwnAnswer(first.answer, first.acceptable), first);
  assert.deepEqual(selectOwnAnswer('throughout', ['daily']).acceptable, ['daily', 'throughout']);
});

test('a paused beat can restore and Back can retain choices without treating the draft as saved', () => {
  const draft = { userId: 'a', questionId: 'q001:1', revision: 2, answer: 'throughout', acceptable: ['throughout', 'daily'], weight: 10, visible: false, explanation: '', beat: 3, weightChosen: true, visibilityChosen: false };
  assert.equal(isUsableDraft(draft, { userId: 'a', questionId: 'q001:1', revision: 2, optionIds: ['throughout', 'daily'] }), true);
  assert.deepEqual(toggleAcceptable('daily', draft.answer, draft.acceptable), ['throughout']);
  assert.equal(isUsableDraft({ ...draft, beat: 3, answer: '' }, { userId: 'a', questionId: 'q001:1', revision: 2 }), false);
  assert.equal(isUsableDraft(draft, { userId: 'a', questionId: 'q001:1', revision: 3 }), false);
});

test('all five importance weights remain valid and old visibility drafts can be restored', () => {
  assert.equal(QUESTION_BEAT_COUNT, 4);
  assert.deepEqual(IMPORTANCE_CHOICES.map(({ value }) => value), [0, 1, 10, 50, 250]);
  for (const { value } of IMPORTANCE_CHOICES) {
    assert.equal(isCompleteQuestionDraft(['throughout', 'daily'], 'throughout', ['throughout', 'daily'], value, 'A short note'), true);
  }
  assert.equal(isCompleteQuestionDraft(['throughout'], 'throughout', ['throughout'], 2, ''), false);
  assert.equal(isCompleteQuestionDraft(['throughout'], 'throughout', ['other'], 10, ''), false);
  assert.equal(isCompleteQuestionDraft(['throughout'], 'throughout', ['throughout'], 10, 'x'.repeat(501)), false);
  for (const visible of [true, false]) {
    const restored = { userId: 'a', questionId: 'q001:1', revision: 2, answer: 'throughout', acceptable: ['throughout'], weight: 250, visible, explanation: 'hello', beat: 4, weightChosen: true, visibilityChosen: true };
    assert.equal(isUsableDraft(restored, { userId: 'a', questionId: 'q001:1', revision: 2, optionIds: ['throughout'] }), true);
  }
  assert.equal(isUsableDraft({ userId: 'a', questionId: 'q001:1', revision: 2, answer: 'throughout', acceptable: ['throughout'], weight: 250, explanation: '', beat: 3, weightChosen: true }, { userId: 'a', questionId: 'q001:1', revision: 2, optionIds: ['throughout'] }), true);
});

test('rapid choices and duplicate saves are blocked until transition or failed save releases the gate', () => {
  const choice = createInteractionGate();
  assert.equal(choice.tryEnter(), true);
  assert.equal(choice.tryEnter(), false);
  choice.reset(); // Back or the next beat
  assert.equal(choice.tryEnter(), true);

  const save = createInteractionGate();
  assert.equal(save.tryEnter(), true);
  assert.equal(save.tryEnter(), false);
  save.reset(); // A rejected save leaves the draft and allows Retry
  assert.equal(save.tryEnter(), true);
});
