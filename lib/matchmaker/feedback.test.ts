import assert from 'node:assert/strict';
import test from 'node:test';

import { buildFeedbackLearningPreview, feedbackReason, MATCHMAKER_FEEDBACK_REASONS } from './feedback.ts';

test('all feedback reasons begin without a global learning scope', () => {
  assert.equal(MATCHMAKER_FEEDBACK_REASONS.length, 6);
  assert.ok(MATCHMAKER_FEEDBACK_REASONS.every((reason) => reason.code && reason.label));
});

test('broad feedback does not create a future-learning preview without detail', () => {
  assert.equal(feedbackReason('lifestyle_mismatch').needsFutureDetail, true);
  assert.equal(buildFeedbackLearningPreview('lifestyle_mismatch'), null);
  assert.equal(buildFeedbackLearningPreview('communication_style', 'more direct'), 'Prefer this communication style: more direct');
});

test('relationship goals produce a useful non-numeric preview', () => {
  assert.equal(feedbackReason('relationship_goals').needsFutureDetail, false);
  assert.equal(buildFeedbackLearningPreview('relationship_goals'), 'Prefer clearly aligned relationship goals');
});
