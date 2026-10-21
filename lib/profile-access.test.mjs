import assert from 'node:assert/strict';
import { test } from 'node:test';

import { getProfileRoute } from './profile-access.ts';

test('signed-in profiles enter the new dating journey', () => {
  assert.equal(getProfileRoute(null), '/dating-setup');
  assert.equal(getProfileRoute({ profileCompleted: false }), '/dating-setup');
  assert.equal(getProfileRoute({ profileCompleted: true, faceVerificationStatus: 'verified' }), '/dating');
  assert.equal(getProfileRoute({ profileCompleted: true, faceVerificationStatus: 'processing' }), '/verification');
  assert.equal(getProfileRoute({
    profileCompleted: true,
    faceVerificationStatus: 'verified',
    waitlist: { status: 'waitlisted' },
  }), '/waitlist');
});
