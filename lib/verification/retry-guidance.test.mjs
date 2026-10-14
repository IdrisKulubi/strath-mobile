import test from 'node:test';
import assert from 'node:assert/strict';

import {
    deriveProfilePhotoIssueSignals,
    getVerificationRetryGuidance,
} from './retry-guidance.ts';

test('provider errors do not falsely blame profile photos', () => {
    const results = [{ decision: 'error', qualityFlags: ['provider_error'] }];
    const signals = deriveProfilePhotoIssueSignals(results);
    const guidance = getVerificationRetryGuidance({
        status: 'retry_required',
        failureReasons: ['provider_error', 'insufficient_match_count'],
        results,
        supportedProfilePhotoCount: 2,
        unsupportedProfilePhotoCount: signals.unsupportedProfilePhotoCount,
    });

    assert.equal(signals.unsupportedProfilePhotoCount, 0);
    assert.equal(guidance.showPhotoAction, false);
});

test('detected profile photo issues still offer photo replacement', () => {
    const results = [{ decision: 'not_matched', qualityFlags: ['no_face_detected'] }];
    const signals = deriveProfilePhotoIssueSignals(results);
    const guidance = getVerificationRetryGuidance({
        status: 'retry_required',
        failureReasons: ['no_face_detected', 'insufficient_match_count'],
        results,
        supportedProfilePhotoCount: 2,
        unsupportedProfilePhotoCount: signals.unsupportedProfilePhotoCount,
    });

    assert.equal(signals.unsupportedProfilePhotoCount, 1);
    assert.equal(guidance.showPhotoAction, true);
});
