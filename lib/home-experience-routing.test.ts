import assert from 'node:assert/strict';
import test from 'node:test';

import { getIncomingLikeRoute } from './home-experience-routing.ts';

test('V1 incoming likes open the Interested section inside Home', () => {
    assert.equal(getIncomingLikeRoute(false), '/(tabs)?homeTab=interested');
});

test('V2 incoming likes open the dedicated Likes tab', () => {
    assert.equal(getIncomingLikeRoute(true), '/(tabs)/pulse');
});
