import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getCardStackExitDragX,
  getCardStackIndices,
  getCardStackOffset,
  isCardStackLayerVisible,
  isCardStackTopCard,
  resolveCardStackTargetIndex,
} from './card-stack-math.ts';

const CARD_WIDTH = 320;

test('stack offset stays continuous across swipe commit boundaries', () => {
  const before = getCardStackOffset(1, 0, -CARD_WIDTH, CARD_WIDTH);
  const after = getCardStackOffset(1, 1, 0, CARD_WIDTH);

  assert.equal(before, 0);
  assert.equal(after, 0);
});

test('third card keeps earlier profiles stacked behind', () => {
  assert.equal(getCardStackOffset(0, 2, 0, CARD_WIDTH), -2);
  assert.equal(getCardStackOffset(1, 2, 0, CARD_WIDTH), -1);
  assert.equal(getCardStackOffset(2, 2, 0, CARD_WIDTH), 0);
});

test('resolves forward and rewind targets from drag distance', () => {
  assert.equal(resolveCardStackTargetIndex(0, -CARD_WIDTH * 0.1, 0, CARD_WIDTH, 3), 0);
  assert.equal(resolveCardStackTargetIndex(0, -CARD_WIDTH * 0.25, 0, CARD_WIDTH, 3), 1);
  assert.equal(resolveCardStackTargetIndex(2, CARD_WIDTH * 0.25, 0, CARD_WIDTH, 3), 1);
});

test('exit drag distance matches index delta', () => {
  assert.equal(getCardStackExitDragX(0, 1, CARD_WIDTH), -CARD_WIDTH);
  assert.equal(getCardStackExitDragX(2, 1, CARD_WIDTH), CARD_WIDTH);
});

test('renders a stable local window for larger shortlists', () => {
  assert.deepEqual(getCardStackIndices(10, 5), [2, 3, 4, 5, 6, 7, 8]);
});
