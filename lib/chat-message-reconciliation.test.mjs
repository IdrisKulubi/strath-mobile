import assert from 'node:assert/strict';
import test from 'node:test';

import { replaceOptimisticMessage } from './chat-message-reconciliation.ts';

test('server confirmation replaces the optimistic message without duplicating text', () => {
  const existing = [
    { id: 'earlier', content: 'Hi', createdAt: '2026-09-30T10:00:00.000Z' },
    { id: 'temp-1', content: 'Hello', createdAt: '2026-09-30T10:01:00.000Z' },
    { id: 'saved-1', content: 'Hello', createdAt: '2026-09-30T10:01:01.000Z' },
  ];
  const saved = existing[2];
  assert.deepEqual(replaceOptimisticMessage(existing, 'temp-1', saved), [existing[0], saved]);
});
