import assert from 'node:assert/strict';
import test from 'node:test';

import type { MatchmakerConversationResponse } from '../../types/matchmaker';

import {
  CANONICAL_MATCHMAKER_PROMPT,
  filterMatchmakerQuickReplies,
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
  assert.equal(shouldShowMatchmakerComposer('limit'), true);
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
  assert.equal(resolveQuickReplyAction('Keep looking'), 'find_another');
  assert.equal(resolveQuickReplyAction("I'll wait for their response"), 'wait_for_response');
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

test('filterMatchmakerQuickReplies removes search actions when quota is exhausted', () => {
  const replies = [
    'Find another',
    'Keep looking',
    'Skip feedback',
    "I'll wait for their response",
    'Help me refine my type',
    'Go ahead and search',
  ];

  const filtered = filterMatchmakerQuickReplies(replies, 0);
  assert.deepEqual(filtered, [
    "I'll wait for their response",
    'Help me refine my type',
  ]);
  assert.deepEqual(filterMatchmakerQuickReplies(replies, 2), replies);
});

test('selectActiveTurn hides search actions after interested feedback with no searches left', () => {
  const data = {
    session: {
      id: 's1',
      state: 'collecting_feedback',
      status: 'active',
      sessionDay: '2026-07-28',
      dailySearchCount: 3,
      searchLimit: 3,
      remainingSearches: 0,
      currentIntent: {},
      currentPlan: {},
      quota: {
        used: 3,
        limit: 3,
        remaining: 0,
        resetsAt: '',
        timezone: 'Africa/Nairobi',
        limitReason: 'daily_search_limit',
      },
    },
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        kind: 'feedback',
        text: 'I see you liked them. While you wait, we can fine-tune what you want.',
        quickReplies: [
          "I'll wait for their response",
          'Open Messages',
          'Help me refine my type',
        ],
        metadata: { outcome: 'interested' },
        createdAt: '',
      },
    ],
    quickReplies: [
      "I'll wait for their response",
      'Open Messages',
      'Help me refine my type',
      'Find another',
    ],
  } satisfies MatchmakerConversationResponse;

  const turn = selectActiveTurn(data);
  assert.equal(turn.variant, 'feedback');
  assert.equal(turn.showSearchAction, false);
  assert.equal(turn.showMessagesAction, true);
  assert.equal(turn.quickReplies.includes('Find another'), false);
  assert.equal(turn.quickReplies.includes('Keep looking'), false);
});

test('selectActiveTurn keeps keep-looking path when searches remain after interest', () => {
  const data = {
    session: {
      id: 's1',
      state: 'collecting_feedback',
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
        kind: 'feedback',
        text: 'Nice choice. Want to keep looking while you wait?',
        quickReplies: [
          'Keep looking',
          "I'll wait for their response",
          'Open Messages',
        ],
        metadata: { outcome: 'interested' },
        createdAt: '',
      },
    ],
    quickReplies: [
      'Keep looking',
      "I'll wait for their response",
      'Open Messages',
    ],
  } satisfies MatchmakerConversationResponse;

  const turn = selectActiveTurn(data);
  assert.equal(turn.variant, 'feedback');
  assert.equal(turn.showSearchAction, true);
  assert.equal(turn.quickReplies.includes('Keep looking'), true);
  assert.equal(resolveQuickReplyAction('Keep looking'), 'find_another');
  assert.equal(resolveQuickReplyAction("I'll wait for their response"), 'wait_for_response');
});

test('selectActiveTurn surfaces limit state with refine replies only', () => {
  const data = {
    session: {
      id: 's1',
      state: 'limit_reached',
      status: 'active',
      sessionDay: '2026-07-28',
      dailySearchCount: 3,
      searchLimit: 3,
      remainingSearches: 0,
      currentIntent: {},
      currentPlan: {},
      quota: {
        used: 3,
        limit: 3,
        remaining: 0,
        resetsAt: '',
        timezone: 'Africa/Nairobi',
        limitReason: 'daily_search_limit',
      },
    },
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        kind: 'limit',
        text: 'That is enough for today. Tell me one thing to sharpen tomorrow.',
        quickReplies: [
          'Help me refine my type',
          'What should I improve?',
          'Find another',
        ],
        metadata: {},
        createdAt: '',
      },
    ],
    quickReplies: [
      'Help me refine my type',
      'What should I improve?',
      'Find another',
    ],
  } satisfies MatchmakerConversationResponse;

  const turn = selectActiveTurn(data);
  assert.equal(turn.variant, 'limit');
  assert.equal(turn.showSearchAction, false);
  assert.equal(turn.quickReplies.includes('Find another'), false);
  assert.equal(shouldShowMatchmakerComposer('limit', 0), true);
});

test('selectActiveTurn forces limit when searches are zero and latest is search_plan', () => {
  const data = {
    session: {
      id: 's1',
      state: 'ready_to_search',
      status: 'active',
      sessionDay: '2026-07-28',
      dailySearchCount: 3,
      searchLimit: 3,
      remainingSearches: 0,
      currentIntent: {},
      currentPlan: {},
      quota: {
        used: 3,
        limit: 3,
        remaining: 0,
        resetsAt: '',
        timezone: 'Africa/Nairobi',
        limitReason: 'daily_search_limit',
      },
    },
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        kind: 'search_plan',
        text: 'Looking for someone calm and active. Ready when you are.',
        quickReplies: ['Find my person', 'Change something'],
        metadata: {},
        createdAt: '',
      },
    ],
    quickReplies: ['Find my person', 'Change something', 'Keep looking'],
  } satisfies MatchmakerConversationResponse;

  const turn = selectActiveTurn(data);
  assert.equal(turn.variant, 'limit');
  assert.equal(turn.showSearchAction, false);
  assert.equal(turn.quickReplies.includes('Find my person'), false);
  assert.equal(turn.quickReplies.includes('Keep looking'), false);
});

test('selectActiveTurn keeps candidate visible with zero searches but no search action', () => {
  const data = {
    session: {
      id: 's1',
      state: 'presenting_candidate',
      status: 'active',
      sessionDay: '2026-07-28',
      dailySearchCount: 3,
      searchLimit: 3,
      remainingSearches: 0,
      currentIntent: {},
      currentPlan: {},
      quota: {
        used: 3,
        limit: 3,
        remaining: 0,
        resetsAt: '',
        timezone: 'Africa/Nairobi',
        limitReason: 'daily_search_limit',
      },
    },
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        kind: 'candidate',
        text: 'Try Alex. Calm and active feels close.',
        quickReplies: ['Not this one', 'Find another'],
        metadata: {
          candidate: {
            candidateUserId: 'u1',
            firstName: 'Alex',
            reason: 'Try Alex. Calm and active feels close.',
            labels: ['Active today'],
          },
        },
        createdAt: '',
      },
    ],
    quickReplies: ['Not this one', 'Find another', 'Keep looking'],
  } satisfies MatchmakerConversationResponse;

  const turn = selectActiveTurn(data);
  assert.equal(turn.variant, 'candidate');
  assert.equal(turn.showSearchAction, false);
  assert.equal(turn.quickReplies.includes('Find another'), false);
  assert.equal(turn.quickReplies.includes('Keep looking'), false);
  assert.equal(shouldShowMatchmakerComposer('candidate', 0), false);
});

test('selectActiveTurn forces limit when searches are zero and latest is text', () => {
  const data = {
    session: {
      id: 's1',
      state: 'clarifying',
      status: 'active',
      sessionDay: '2026-07-28',
      dailySearchCount: 3,
      searchLimit: 3,
      remainingSearches: 0,
      currentIntent: {},
      currentPlan: {},
      quota: {
        used: 3,
        limit: 3,
        remaining: 0,
        resetsAt: '',
        timezone: 'Africa/Nairobi',
        limitReason: 'daily_search_limit',
      },
    },
    messages: [
      {
        id: 'm1',
        role: 'assistant',
        kind: 'text',
        text: 'Tell me more about the vibe you want.',
        quickReplies: ['Someone calm'],
        metadata: {},
        createdAt: '',
      },
    ],
    quickReplies: ['Someone calm', 'Go ahead and search'],
  } satisfies MatchmakerConversationResponse;

  const turn = selectActiveTurn(data);
  assert.equal(turn.variant, 'limit');
  assert.equal(turn.showSearchAction, false);
  assert.equal(turn.quickReplies.includes('Go ahead and search'), false);
});
