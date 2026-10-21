import { Extrapolation, interpolate } from 'react-native-reanimated';

export {
  CARD_STACK_EXIT,
  CARD_STACK_GESTURE,
  CARD_STACK_PEEK,
  CARD_STACK_SPRING_BACK,
  CARD_STACK_VISIBLE_RANGE,
  getCardStackExitDragX,
  getCardStackIndices,
  getCardStackOffset,
  isCardStackLayerVisible,
  isCardStackTopCard,
  resolveCardStackTargetIndex,
} from '@/lib/matchmaker/card-stack-math';

export interface CardStackLayerStyle {
  zIndex: number;
  opacity: number;
  transform: Array<
    | { translateX: number }
    | { translateY: number }
    | { scale: number }
    | { rotate: string }
  >;
}

export function getCardStackLayerStyle(
  offset: number,
  cardWidth: number,
): CardStackLayerStyle {
  'worklet';

  const absOffset = Math.abs(offset);
  const depth = Math.min(absOffset, 3);
  const direction = offset < 0 ? -1 : 1;

  const scale = interpolate(
    depth,
    [0, 1, 2, 3],
    [1, 0.968, 0.938, 0.914],
    Extrapolation.CLAMP,
  );

  const translateY = interpolate(
    depth,
    [0, 1, 2, 3],
    [0, -13, -25, -36],
    Extrapolation.CLAMP,
  );

  const translateX = interpolate(
    depth,
    [0, 1, 2, 3],
    [0, direction * -11, direction * -7, direction * -4],
    Extrapolation.CLAMP,
  );

  const rotate = interpolate(
    offset,
    [-3, -2, -1, 0, 1, 2, 3],
    [-3.2, -2.6, -1.8, 0, 1.8, 2.6, 3.2],
    Extrapolation.CLAMP,
  );

  const opacity = interpolate(
    absOffset,
    [0, 1.4, 2.4, 2.6],
    [1, 0.96, 0.9, 0],
    Extrapolation.CLAMP,
  );

  const zIndex = Math.round(100 - absOffset * 24);

  return {
    zIndex,
    opacity,
    transform: [
      { translateX },
      { translateY },
      { scale },
      { rotate: `${rotate}deg` },
    ],
  };
}

export function getActiveCardDragStyle(
  dragX: number,
  cardWidth: number,
) {
  'worklet';

  const rotate = interpolate(
    dragX,
    [-cardWidth, 0, cardWidth],
    [-5, 0, 5],
    Extrapolation.CLAMP,
  );

  const opacity = interpolate(
    Math.abs(dragX),
    [0, cardWidth * 0.65, cardWidth],
    [1, 0.95, 0.88],
    Extrapolation.CLAMP,
  );

  return {
    zIndex: 120,
    opacity,
    transform: [
      { translateX: dragX },
      { translateY: 0 },
      { scale: 1 },
      { rotate: `${rotate}deg` },
    ],
  };
}
