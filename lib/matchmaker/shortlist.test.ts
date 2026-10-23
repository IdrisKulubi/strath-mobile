import assert from 'node:assert/strict';
import test from 'node:test';

import { buildShortlistComparison, candidateAtShortlistPosition, clampShortlistPosition, readMatchmakerShortlist, shouldShowShortlistComparison } from './shortlist.ts';
import type { MatchmakerBrief, MatchmakerConversationMessage } from '../../types/matchmaker.ts';

function message(shortlist: unknown): MatchmakerConversationMessage {
  return { id: 'message', role: 'assistant', kind: 'candidate', text: 'Found matches', quickReplies: [], metadata: { shortlist }, createdAt: new Date(0).toISOString() };
}

test('reads one, two, or three persisted shortlist candidates', () => {
  for (const size of [1, 2, 3]) {
    const parsed = readMatchmakerShortlist(message({ id: 'shortlist', briefVersion: 2, candidates: Array.from({ length: size }, (_, index) => ({ candidateUserId: `user-${index}`, firstName: 'A', reason: 'Grounded reason', labels: [], explanation: { fitReasons: ['Shared values'], matchedPreferenceIds: ['preference'], reciprocalFitEvidence: [], tradeoff: null, unknown: null } })) }));
    assert.equal(parsed?.candidates.length, size);
  }
});

test('rejects malformed or padded shortlist payloads', () => {
  assert.equal(readMatchmakerShortlist(message({ id: 'empty', candidates: [] })), null);
  assert.equal(readMatchmakerShortlist(message({ id: 'padded', candidates: Array.from({ length: 4 }, (_, index) => ({ candidateUserId: `u-${index}`, reason: 'x' })) })), null);
});

test('clamps shortlist position without changing candidate order', () => {
  const shortlist = readMatchmakerShortlist(message({ id: 'shortlist', candidates: [
    { candidateUserId: 'first', reason: 'x' }, { candidateUserId: 'second', reason: 'y' },
  ] }))!;
  assert.equal(candidateAtShortlistPosition(shortlist, 9)?.candidateUserId, 'second');
});

test('comparison uses confirmed positive priorities only and never invents evidence', () => {
  const shortlist = readMatchmakerShortlist(message({ id: 'shortlist', candidates: [
    { candidateUserId: 'first', reason: 'x', explanation: { fitReasons: [], matchedPreferenceIds: ['confirmed'], reciprocalFitEvidence: [], tradeoff: null, unknown: null } },
    { candidateUserId: 'second', reason: 'y', explanation: { fitReasons: [], matchedPreferenceIds: [], reciprocalFitEvidence: [], tradeoff: null, unknown: null } },
  ] }))!;
  const brief: MatchmakerBrief = {
    version: 1, latestChangeId: null, updatedAt: null,
    preferences: [
      { id: 'confirmed', category: 'values', value: 'Kind', sentiment: 'prefer', importance: 'must_have', certainty: 'confirmed', source: 'direct', status: 'active', version: 1, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'inferred', category: 'values', value: 'Funny', sentiment: 'prefer', importance: 'prefer', certainty: 'inferred', source: 'system', status: 'active', version: 1, metadata: {}, createdAt: '', updatedAt: '' },
      { id: 'avoid', category: 'lifestyle', value: 'Nightlife', sentiment: 'avoid', importance: 'prefer', certainty: 'confirmed', source: 'direct', status: 'active', version: 1, metadata: {}, createdAt: '', updatedAt: '' },
    ],
  };
  const rows = buildShortlistComparison(brief, shortlist);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].label, 'Kind');
  assert.deepEqual(rows[0].candidates.map((value) => value.evidence), ['Strong evidence', 'Not enough information']);
});

test('single candidate shortlists hide comparison and restored positions are bounded', () => {
  assert.equal(shouldShowShortlistComparison(1, 3), false);
  assert.equal(shouldShowShortlistComparison(2, 1), true);
  assert.equal(clampShortlistPosition(8, 3), 2);
  assert.equal(clampShortlistPosition(-2, 3), 0);
});
