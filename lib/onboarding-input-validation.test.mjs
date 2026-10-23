import assert from 'node:assert/strict';
import test from 'node:test';

import { ageFromBirthDate, ageRangeError, birthDateError, radiusError } from './onboarding-input-validation.ts';

const now = new Date('2026-09-24T12:00:00Z');

test('adult eligibility respects the exact birthday and rejects invalid calendar dates', () => {
    assert.equal(ageFromBirthDate('2008-09-24', now), 18);
    assert.equal(birthDateError('2008-09-24', now), null);
    assert.match(birthDateError('2008-09-25', now) ?? '', /at least 18/);
    assert.match(birthDateError('2008-02-30', now) ?? '', /valid birth date/);
    assert.match(birthDateError('1900-01-01', now) ?? '', /valid birth date/);
});

test('age and distance limits match the preferences API contract', () => {
    assert.equal(ageRangeError('18', '100'), null);
    assert.ok(ageRangeError('17', '25'));
    assert.ok(ageRangeError('30', '29'));
    assert.ok(ageRangeError('20', '101'));
    assert.ok(ageRangeError('20.5', '30'));
    assert.equal(radiusError('1'), null);
    assert.equal(radiusError('500'), null);
    assert.ok(radiusError('0'));
    assert.ok(radiusError('501'));
});
