import assert from 'node:assert/strict';
import test from 'node:test';
import { hasCurrentFaceVerification, currentVerificationStatus } from './current-status.ts';

test('legacy exemption cannot send an unverified questionnaire user back to Discover', () => {
    assert.equal(hasCurrentFaceVerification({ faceVerificationRequired: false, faceVerificationStatus: 'not_started' }), false);
    assert.equal(hasCurrentFaceVerification({ faceVerificationRequired: false }), false);
    assert.equal(hasCurrentFaceVerification({ faceVerificationStatus: 'verified' }), true);
    assert.equal(hasCurrentFaceVerification(null), false);
});

test('old verified sessions cannot bypass verification reset after photos change', () => {
    assert.equal(currentVerificationStatus('not_started', 'verified'), 'not_started');
    assert.equal(currentVerificationStatus('retry_required', 'verified'), 'retry_required');
    assert.equal(currentVerificationStatus(undefined, 'verified'), 'not_started');
});

test('current processing and retry sessions remain usable and a verified profile can exit', () => {
    assert.equal(currentVerificationStatus('not_started', 'processing'), 'processing');
    assert.equal(currentVerificationStatus('not_started', 'retry_required'), 'retry_required');
    assert.equal(currentVerificationStatus('verified', 'processing'), 'verified');
    assert.equal(currentVerificationStatus('not_started', undefined), 'not_started');
});
