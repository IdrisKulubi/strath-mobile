import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-expect-error Node's strip-types test runner resolves the TypeScript extension directly.
import { shouldPromptForMatchmakerFeedback } from './experience-feedback.ts';

test('first prompt waits until daily searches are finished', () => {
  assert.equal(shouldPromptForMatchmakerFeedback({
    sessionDay: '2026-08-09',
    deferredOn: null,
    searchesFinished: false,
  }), false);
  assert.equal(shouldPromptForMatchmakerFeedback({
    sessionDay: '2026-08-09',
    deferredOn: null,
    searchesFinished: true,
  }), true);
});

test('Maybe later suppresses the prompt for the rest of that day', () => {
  assert.equal(shouldPromptForMatchmakerFeedback({
    sessionDay: '2026-08-09',
    deferredOn: '2026-08-09',
    searchesFinished: true,
  }), false);
});

test('a deferred prompt becomes due on the next day before searches finish', () => {
  assert.equal(shouldPromptForMatchmakerFeedback({
    sessionDay: '2026-08-10',
    deferredOn: '2026-08-09',
    searchesFinished: false,
  }), true);
});
