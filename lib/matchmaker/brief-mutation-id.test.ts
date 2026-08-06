import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMatchmakerBriefMutationId } from './brief-mutation-id.ts';

test('brief mutation ids are stable for retries and change with version or operation', () => {
  const input = { baseVersion: 2, operations: [{ type: 'add' as const, category: 'values' as const, value: 'kind' }] };
  assert.equal(buildMatchmakerBriefMutationId(input), buildMatchmakerBriefMutationId(input));
  assert.notEqual(buildMatchmakerBriefMutationId(input), buildMatchmakerBriefMutationId({ ...input, baseVersion: 3 }));
  assert.notEqual(buildMatchmakerBriefMutationId(input), buildMatchmakerBriefMutationId({ ...input, operations: [{ ...input.operations[0], value: 'honest' }] }));
});
