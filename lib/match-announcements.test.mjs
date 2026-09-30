import assert from 'node:assert/strict';
import test from 'node:test';

import { planMatchAnnouncements, unseenMatchAnnouncements } from './match-announcements.ts';

test('announces only unseen real connections in newest-first order', () => {
  const connections = [
    { matchId: 'new', partner: { name: 'Mariah', photos: ['photo'] } },
    { matchId: 'seen', partner: { name: 'Sam', photos: [] } },
    { matchId: 'older', partner: { name: 'Alex', photos: [] } },
  ];
  assert.deepEqual(unseenMatchAnnouncements(connections, new Set(['seen'])), [
    { matchId: 'new', name: 'Mariah', photo: 'photo' },
    { matchId: 'older', name: 'Alex', photo: null },
  ]);
});

test('first launch shows only the newest unseen match and remembers older ones', () => {
  const connections = [
    { matchId: 'new', partner: { name: 'Mariah', photos: [] } },
    { matchId: 'old', partner: { name: 'Alex', photos: [] } },
  ];
  assert.deepEqual(planMatchAnnouncements(connections, new Set(), true), {
    announcements: [{ matchId: 'new', name: 'Mariah', photo: null }],
    markSeen: ['new', 'old'],
  });
  assert.deepEqual(planMatchAnnouncements(connections, new Set(['old']), false), {
    announcements: [{ matchId: 'new', name: 'Mariah', photo: null }],
    markSeen: ['new'],
  });
});
