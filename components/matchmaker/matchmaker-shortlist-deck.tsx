import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import { MATCHMAKER_HOME, RADIUS } from '@/lib/design-tokens';

const SPRING_BACK = { damping: 28, stiffness: 320, mass: 0.7 };
const EXIT_DURATION = 240;
const STACK_PEEK = 28;
const MAX_BEHIND = 2;

interface MatchmakerShortlistDeckProps<T> {
  items: T[];
  position: number;
  cardWidth: number;
  cardHeight: number;
  keyExtractor: (item: T, index: number) => string;
  renderCard: (item: T, index: number) => React.ReactNode;
  onPositionChange: (next: number) => void;
  style?: StyleProp<ViewStyle>;
}

function triggerHaptic() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
}

interface DeckLayerProps {
  children: React.ReactNode;
  dragX: SharedValue<number>;
  cardWidth: number;
  stackOffset: number;
  isTop: boolean;
  reduceMotion: boolean | null;
}

function DeckLayer({
  children,
  dragX,
  cardWidth,
  stackOffset,
  isTop,
  reduceMotion,
}: DeckLayerProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const dragProgress = interpolate(
      dragX.value,
      [-cardWidth, 0, cardWidth],
      [1, 0, -1],
      Extrapolation.CLAMP,
    );

    if (isTop) {
      const rotate = interpolate(
        dragX.value,
        [-cardWidth, 0, cardWidth],
        [-4, 0, 4],
        Extrapolation.CLAMP,
      );
      const opacity = interpolate(
        Math.abs(dragX.value),
        [0, cardWidth * 0.55, cardWidth],
        [1, 0.92, 0.72],
        Extrapolation.CLAMP,
      );

      return {
        zIndex: 30,
        opacity,
        transform: [
          { translateX: dragX.value },
          { rotate: `${rotate}deg` },
        ],
      };
    }

    const effectiveOffset = Math.max(0, stackOffset - Math.max(0, dragProgress));
    const scale = interpolate(effectiveOffset, [0, 1, 2], [1, 0.972, 0.945], Extrapolation.CLAMP);
    const translateY = interpolate(effectiveOffset, [0, 1, 2], [0, -12, -24], Extrapolation.CLAMP);
    const translateX = stackOffset === 1
      ? interpolate(effectiveOffset, [0, 1, 2], [0, -10, -6], Extrapolation.CLAMP)
      : interpolate(effectiveOffset, [0, 1, 2], [0, 12, 16], Extrapolation.CLAMP);
    const rotate = stackOffset === 1 ? '-2deg' : '2.4deg';

    return {
      zIndex: 20 - stackOffset,
      opacity: interpolate(effectiveOffset, [0, 2], [1, 0.88], Extrapolation.CLAMP),
      transform: [
        { translateX },
        { translateY },
        { scale },
        { rotate },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.layer,
        reduceMotion && styles.layerReducedMotion,
        animatedStyle,
      ]}
    >
      {children}
    </Animated.View>
  );
}

interface IncomingPreviousLayerProps {
  children: React.ReactNode;
  dragX: SharedValue<number>;
  cardWidth: number;
  visible: boolean;
}

function IncomingPreviousLayer({
  children,
  dragX,
  cardWidth,
  visible,
}: IncomingPreviousLayerProps) {
  const animatedStyle = useAnimatedStyle(() => {
    if (!visible) {
      return { opacity: 0, zIndex: 0, transform: [{ translateX: -cardWidth }] };
    }

    const translateX = interpolate(
      dragX.value,
      [0, cardWidth],
      [-cardWidth * 0.9, 0],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      dragX.value,
      [0, cardWidth],
      [0.97, 1],
      Extrapolation.CLAMP,
    );

    return {
      zIndex: 12,
      opacity: interpolate(dragX.value, [0, cardWidth * 0.25], [0, 1], Extrapolation.CLAMP),
      transform: [{ translateX }, { scale }],
    };
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.layer, animatedStyle]}>
      {children}
    </Animated.View>
  );
}

export function MatchmakerShortlistDeck<T>({
  items,
  position,
  cardWidth,
  cardHeight,
  keyExtractor,
  renderCard,
  onPositionChange,
  style,
}: MatchmakerShortlistDeckProps<T>) {
  const reduceMotion = useReducedMotion();
  const dragX = useSharedValue(0);
  const isTransitioning = useSharedValue(false);
  const positionValue = useSharedValue(position);
  const threshold = cardWidth * 0.2;
  const flingVelocity = 720;

  useEffect(() => {
    positionValue.value = position;
    cancelAnimation(dragX);
    dragX.value = 0;
    isTransitioning.value = false;
  }, [dragX, isTransitioning, position, positionValue]);

  const commitPosition = useCallback((next: number) => {
    if (next < 0 || next >= items.length || next === position) return;
    triggerHaptic();
    onPositionChange(next);
  }, [items.length, onPositionChange, position]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-12, 12])
    .failOffsetY([-20, 20])
    .onBegin(() => {
      if (isTransitioning.value) return;
      cancelAnimation(dragX);
    })
    .onUpdate((event) => {
      if (isTransitioning.value) return;

      const currentPosition = positionValue.value;
      const atStart = currentPosition <= 0;
      const atEnd = currentPosition >= items.length - 1;
      let nextX = event.translationX;

      if (atStart && nextX > 0) nextX *= 0.28;
      if (atEnd && nextX < 0) nextX *= 0.28;

      dragX.value = nextX;
    })
    .onEnd((event) => {
      if (isTransitioning.value) return;

      const currentPosition = positionValue.value;
      const shouldAdvance =
        (event.translationX < -threshold || event.velocityX < -flingVelocity)
        && currentPosition < items.length - 1;
      const shouldRewind =
        (event.translationX > threshold || event.velocityX > flingVelocity)
        && currentPosition > 0;

      if (shouldAdvance) {
        isTransitioning.value = true;
        const duration = reduceMotion ? 0 : EXIT_DURATION;
        dragX.value = withTiming(-cardWidth, {
          duration,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (!finished) {
            isTransitioning.value = false;
            return;
          }
          runOnJS(commitPosition)(currentPosition + 1);
        });
        return;
      }

      if (shouldRewind) {
        isTransitioning.value = true;
        const duration = reduceMotion ? 0 : EXIT_DURATION;
        dragX.value = withTiming(cardWidth, {
          duration,
          easing: Easing.out(Easing.cubic),
        }, (finished) => {
          if (!finished) {
            isTransitioning.value = false;
            return;
          }
          runOnJS(commitPosition)(currentPosition - 1);
        });
        return;
      }

      dragX.value = withSpring(0, SPRING_BACK);
    });

  const behindIndices = [];
  for (let offset = Math.min(MAX_BEHIND, items.length - position - 1); offset >= 1; offset -= 1) {
    behindIndices.push(position + offset);
  }

  const topItem = items[position];

  return (
    <View style={[styles.host, { width: cardWidth, height: cardHeight + STACK_PEEK }, style]}>
      <View style={[styles.deck, { width: cardWidth, height: cardHeight + STACK_PEEK }]}>
        {position > 0 ? (
          <IncomingPreviousLayer dragX={dragX} cardWidth={cardWidth} visible>
            {renderCard(items[position - 1], position - 1)}
          </IncomingPreviousLayer>
        ) : null}

        {behindIndices.map((index) => (
          <DeckLayer
            key={keyExtractor(items[index], index)}
            dragX={dragX}
            cardWidth={cardWidth}
            stackOffset={index - position}
            isTop={false}
            reduceMotion={reduceMotion}
          >
            {renderCard(items[index], index)}
          </DeckLayer>
        ))}

        {topItem ? (
          <GestureDetector gesture={panGesture}>
            <DeckLayer
              dragX={dragX}
              cardWidth={cardWidth}
              stackOffset={0}
              isTop
              reduceMotion={reduceMotion}
            >
              {renderCard(topItem, position)}
            </DeckLayer>
          </GestureDetector>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: 'center',
  },
  deck: {
    position: 'relative',
    paddingTop: STACK_PEEK,
  },
  layer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: RADIUS.xl + 4,
    shadowColor: MATCHMAKER_HOME.background,
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  layerReducedMotion: {
    shadowOpacity: 0.18,
    shadowRadius: 10,
  },
});
