/** How far cards peek above the deck container. */
export const CARD_STACK_PEEK = 28;

/** Furthest stack layer rendered on either side of the active card. */
export const CARD_STACK_VISIBLE_RANGE = 2.6;

export const CARD_STACK_SPRING_BACK = { damping: 30, stiffness: 340, mass: 0.68 };

export const CARD_STACK_EXIT = {
  duration: 300,
};

export const CARD_STACK_GESTURE = {
  activeOffsetX: 12,
  failOffsetY: 20,
  swipeThresholdRatio: 0.18,
  flingVelocity: 680,
  edgeResistance: 0.24,
};

/**
 * Continuous stack offset for a card.
 *  0  = active / front
 *  1+ = upcoming cards behind
 * -1- = previously viewed cards toward the back
 */
export function getCardStackOffset(
  cardIndex: number,
  activeIndex: number,
  dragX: number,
  cardWidth: number,
) {
  'worklet';
  const dragProgress = dragX / cardWidth;
  return cardIndex - activeIndex + dragProgress;
}

export function isCardStackLayerVisible(offset: number) {
  'worklet';
  return Math.abs(offset) <= 2.6;
}

export function isCardStackTopCard(offset: number) {
  'worklet';
  return Math.abs(offset) < 0.5;
}

export function getCardStackIndices(
  itemCount: number,
  activeIndex: number,
): number[] {
  const start = Math.max(0, Math.floor(activeIndex - CARD_STACK_VISIBLE_RANGE));
  const end = Math.min(itemCount - 1, Math.ceil(activeIndex + CARD_STACK_VISIBLE_RANGE));
  const indices: number[] = [];
  for (let index = start; index <= end; index += 1) {
    indices.push(index);
  }
  return indices;
}

export function resolveCardStackTargetIndex(
  activeIndex: number,
  dragX: number,
  velocityX: number,
  cardWidth: number,
  itemCount: number,
) {
  'worklet';
  const threshold = cardWidth * 0.18;
  const flingVelocity = 680;

  const shouldAdvance =
    (dragX < -threshold || velocityX < -flingVelocity)
    && activeIndex < itemCount - 1;

  const shouldRewind =
    (dragX > threshold || velocityX > flingVelocity)
    && activeIndex > 0;

  if (shouldAdvance) return activeIndex + 1;
  if (shouldRewind) return activeIndex - 1;

  const dragProgress = dragX / cardWidth;
  const projected = activeIndex - dragProgress;
  return Math.max(0, Math.min(itemCount - 1, Math.round(projected)));
}

export function getCardStackExitDragX(
  fromIndex: number,
  toIndex: number,
  cardWidth: number,
) {
  'worklet';
  const delta = toIndex - fromIndex;
  return -delta * cardWidth;
}
