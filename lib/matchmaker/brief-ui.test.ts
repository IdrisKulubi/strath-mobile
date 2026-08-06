import assert from 'node:assert/strict';
import test from 'node:test';

import { groupMatchmakerBrief, summarizeMatchmakerBrief } from './brief-ui.ts';
import type { MatchmakerBriefPreference } from '../../types/matchmaker.ts';

function preference(overrides: Partial<MatchmakerBriefPreference>): MatchmakerBriefPreference {
  return {
    id: crypto.randomUUID(),
    category: 'other',
    value: 'kind',
    sentiment: 'prefer',
    importance: 'prefer',
    certainty: 'confirmed',
    source: 'direct',
    status: 'active',
    version: 1,
    metadata: {},
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
    ...overrides,
  };
}

test('groups inferred preferences as still learning instead of confirmed criteria', () => {
  const brief = { version: 1, latestChangeId: null, updatedAt: null, preferences: [
    preference({ certainty: 'inferred', importance: 'must_have' }),
  ] };
  const groups = groupMatchmakerBrief(brief);
  assert.equal(groups.mustHaves.length, 0);
  assert.equal(groups.stillLearning.length, 1);
});

test('groups confirmed avoids separately from positive priorities', () => {
  const brief = { version: 1, latestChangeId: null, updatedAt: null, preferences: [
    preference({ sentiment: 'avoid', importance: 'must_have' }),
    preference({ value: 'serious', importance: 'must_have' }),
  ] };
  const groups = groupMatchmakerBrief(brief);
  assert.equal(groups.avoids.length, 1);
  assert.equal(groups.mustHaves.length, 1);
  assert.equal(summarizeMatchmakerBrief(brief), '2 details guiding your matches.');
});
