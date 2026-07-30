import assert from 'node:assert/strict';
import test from 'node:test';

import type { MatchmakerConversationResponse } from '../../types/matchmaker';

import {
  CANONICAL_MATCHMAKER_PROMPT,
  formatRemainingSearches,
  getAssistantPromptText,
  getDistinctCandidateLabels,
  getMatchmakerVisualState,
  getSessionStatusLabel,
  humanizeCandidateLead,
  isFeedbackReasonReply,
  isMatchmakerSearchConfirmation,
  isMatchmakerSearchRefinement,
  normalizeQuickReplyLabel,
  partitionConversationMessages,
  resolveQuickReplyAction,
  selectActiveTurn,
  shouldShowMatchmakerComposer,
  shouldEnableMatchmakerQuery,
} from './conversation-ui.ts';

test('formatRemainingSearches handles singular and zero', () => {
  assert.equal(formatRemainingSearches(3), '3 searches left today');
  assert.equal(formatRemainingSearches(1), '1 search left today');
  assert.equal(formatRemainingSearches(0), 'No searches left today');
});

test('getSessionStatusLabel maps session states', () => {
  assert.equal(getSessionStatusLabel('ready_to_search'), 'Ready to search');
  assert.equal(getSessionStatusLabel('limit_reached'), 'Paused for today');
});

test('greeting messages preserve the conversational backend copy', () => {
  const greeting = {
    id: 'g1',
    role: 'assistant',
    kind: 'greeting',
    text: 'Morning Idris. I can help you find someone.',
    quickReplies: [],
    metadata: {},
    createdAt: '',
  } as MatchmakerConversationResponse['messages'][number];

  assert.equal(getAssistantPromptText(greeting), greeting.text);
  assert.equal(getAssistantPromptText(null), CANONICAL_MATCHMAKER_PROMPT);
});

test('visual state prioritizes errors, pauses, searches, and success', () => {
  assert.equal(getMatchmakerVisualState({ isError: true, isLoading: true }), 'error');
  assert.equal(getMatchmakerVisualState({ sessionState: 'limit_reached' }), 'paused');
  assert.equal(
    getMatchmakerVisualState({ sessionState: 'ready_to_search', isMutating: true }),
    'searching',
  );
  assert.equal(getMatchmakerVisualState({ sessionState: 'presenting_candidate' }), 'success');
  assert.equal(getMatchmakerVisualState({ isLoading: true }), 'thinking');
});

test('composer is available for typing and hidden for terminal feedback states', () => {
  assert.equal(shouldShowMatchmakerComposer('prompt'), true);
  assert.equal(shouldShowMatchmakerComposer('candidate', 2), true);
  assert.equal(shouldShowMatchmakerComposer('candidate', 0), false);
  assert.equal(shouldShowMatchmakerComposer('no_result'), true);
  assert.equal(shouldShowMatchmakerComposer('feedback'), false);
  assert.equal(shouldShowMatchmakerComposer('limit'), false);
});

test('humanizeCandidateLead strips robotic prefixes', () => {
  assert.equal(
    humanizeCandidateLead('I would start here. Active today and complete profile.', 'Cynthia'),
    'Active today and complete profile.',
  );
});

test('getDistinctCandidateLabels removes labels already covered by reason', () => {
  const labels = getDistinctCandidateLabels(
    ['Active today', 'Complete profile', 'Serious'],
    'Active today, complete profile and close to what you asked for.',
  );
  assert.equal(labels.length, 1);
  assert.equal(labels[0], 'Serious');
});

test('normalizeQuickReplyLabel rewrites search aliases', () => {
  assert.equal(normalizeQuickReplyLabel('Go ahead and search'), 'Find my person');
  assert.equal(normalizeQuickReplyLabel('Skip feedback'), 'Skip');
});

test('resolveQuickReplyAction maps guided actions', () => {
  assert.equal(resolveQuickReplyAction('Find another'), 'find_another');
  assert.equal(resolveQuickReplyAction('Not this one'), 'not_this_one');
  assert.equal(resolveQuickReplyAction('Not my vibe'), 'feedback_reason');
  assert.equal(resolveQuickReplyAction('yes please'), 'search');
  assert.equal(resolveQuickReplyAction('keep searching'), 'search');
  assert.equal(resolveQuickReplyAction('Change something'), 'send_text');
});

test('confirmation helpers distinguish proceed vs refine', () => {
  assert.equal(isMatchmakerSearchConfirmation('start now'), true);
  assert.equal(isMatchmakerSearchConfirmation('thanks'), true);
  assert.equal(isMatchmakerSearchRefinement('Make it more serious'), true);
  assert.equal(isMatchmakerSearchConfirmation('Make it more serious'), false);
});

test('partitionConversationMessages keeps candidate turns focused', () => {
  const messages = [
    { id: '1', role: 'assistant', kind: 'greeting', text: 'Hi', quickReplies: [], metadata: {}, createdAt: '' },
    { id: '2', role: 'user', kind: 'text', text: 'Calm', quickReplies: [], metadata: {}, createdAt: '' },
    {
      id: '3',
      role: 'assistant',
      kind: 'candidate',
      text: 'Try this person',
      quickReplies: [],
      metadata: { candidate: { candidateUserId: 'u1', reason: 'Fit', labels: [] } },
      createdAt: '',
    },
  ] as MatchmakerConversationResponse['messages'];

  const partitioned = partitionConversationMessages(messages);
  assert.equal(partitioned.history.length, 2);
  assert.equal(partitioned.active.length, 1);
  assert.equal(partitioned.active[0]?.kind, 'candidate');
});

test('selectActiveTurn surfaces candidate introduction state', () => {
  const data = {
    session: {
      id: 's1',
      state: 'presenting_candidate',
      status: 'active',
      sessionDay: '2026-07-28',
      dailySearchCount: 1,
      searchLimit: 3,
      remainingSearches: 2,
      currentIntent: {},
      currentPlan: {},
      quota: {
        used: 1,
        limit: 3,
        remaining: 2,
        resetsAt: '',
        timezone: 'Africa/Nairobi',
        limitReason: null,
      },
    },
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        kind: 'candidate',
        text: "I'd start with Alex. Calm and active feels close to your direction.",
        quickReplies: ['Not this one'],
        metadata: {
          candidate: {
            candidateUserId: 'u1',
            firstName: 'Alex',
            reason: "I'd start with Alex. Calm and active feels close to your direction.",
            labels: ['Active today'],
          },
        },
        createdAt: '',
      },
    ],
    quickReplies: ['Not this one', 'Find another'],
  } satisfies MatchmakerConversationResponse;

  const turn = selectActiveTurn(data);
  assert.equal(turn.variant, 'candidate');
  assert.equal(turn.candidate?.firstName, 'Alex');
  assert.equal(turn.promptText, "I'd start with Alex. Calm and active feels close to your direction.");
  assert.equal(turn.showSearchAction, true);
  assert.equal(turn.searchActionLabel, 'Find another');
});

test('shouldEnableMatchmakerQuery respects consent', () => {
  assert.equal(shouldEnableMatchmakerQuery(true, false), true);
  assert.equal(shouldEnableMatchmakerQuery(false, false), false);
  assert.equal(shouldEnableMatchmakerQuery(true, true), false);
});

test('isFeedbackReasonReply identifies reason chips', () => {
  assert.equal(isFeedbackReasonReply('Too social'), true);
  assert.equal(isFeedbackReasonReply('Find another'), false);
});
