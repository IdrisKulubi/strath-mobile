import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';

import {
  CARD_STACK_EXIT,
  CARD_STACK_GESTURE,
  CARD_STACK_PEEK,
  CARD_STACK_SPRING_BACK,
  getCardStackExitDragX,
  getCardStackIndices,
  getCardStackOffset,
  isCardStackLayerVisible,
  isCardStackTopCard,
  resolveCardStackTargetIndex,
} from '@/lib/matchmaker/card-stack-math';
import {
  getActiveCardDragStyle,
  getCardStackLayerStyle,
} from '@/lib/matchmaker/card-stack-animation';
import { MATCHMAKER_HOME, RADIUS } from '@/lib/design-tokens';

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

interface StackCardLayerProps {
  cardIndex: number;
  activeIndex: SharedValue<number>;
  dragX: SharedValue<number>;
  cardWidth: number;
  children: React.ReactNode;
  reduceMotion: boolean | null;
}

function StackCardLayer({
  cardIndex,
  activeIndex,
  dragX,
  cardWidth,
  children,
  reduceMotion,
}: StackCardLayerProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const offset = getCardStackOffset(cardIndex, activeIndex.value, dragX.value, cardWidth);

    if (!isCardStackLayerVisible(offset)) {
      return {
        opacity: 0,
        zIndex: 0,
        transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 0.9 }],
      };
    }

    if (isCardStackTopCard(offset)) {
      return getActiveCardDragStyle(dragX.value, cardWidth);
    }

    return getCardStackLayerStyle(offset, cardWidth);
  });

  return (
    <Animated.View
      pointerEvents="box-none"
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
  const itemCount = items.length;
  const activeIndex = useSharedValue(position);
  const dragX = useSharedValue(0);
  const isTransitioning = useSharedValue(false);
  const gestureStartX = useSharedValue(0);
  const lastIndex = Math.max(0, itemCount - 1);

  const visibleIndices = useMemo(() => {
    if (itemCount <= 8) {
      return Array.from({ length: itemCount }, (_, index) => index);
    }
    return getCardStackIndices(itemCount, position);
  }, [itemCount, position]);

  useEffect(() => {
    cancelAnimation(dragX);
    activeIndex.value = position;
    dragX.value = 0;
    isTransitioning.value = false;
  }, [activeIndex, dragX, isTransitioning, position]);

  const commitPosition = useCallback((next: number) => {
    if (next < 0 || next >= itemCount) return;
    triggerHaptic();
    onPositionChange(next);
  }, [itemCount, onPositionChange]);

  const gestureActiveOffsetX = CARD_STACK_GESTURE.activeOffsetX;
  const gestureFailOffsetY = CARD_STACK_GESTURE.failOffsetY;
  const gestureEdgeResistance = CARD_STACK_GESTURE.edgeResistance;

  const panGesture = useMemo(() => Gesture.Pan()
    .activeOffsetX([-gestureActiveOffsetX, gestureActiveOffsetX])
    .failOffsetY([-gestureFailOffsetY, gestureFailOffsetY])
    .onBegin(() => {
      if (isTransitioning.value) return;
      cancelAnimation(dragX);
      gestureStartX.value = dragX.value;
    })
    .onUpdate((event) => {
      if (isTransitioning.value) return;

      const currentIndex = activeIndex.value;
      const atStart = currentIndex <= 0;
      const atEnd = currentIndex >= lastIndex;
      let nextX = gestureStartX.value + event.translationX;

      if (atStart && nextX > 0) nextX *= gestureEdgeResistance;
      if (atEnd && nextX < 0) nextX *= gestureEdgeResistance;

      dragX.value = nextX;
    })
    .onEnd((event) => {
      if (isTransitioning.value) return;

      const currentIndex = activeIndex.value;
      const targetIndex = resolveCardStackTargetIndex(
        currentIndex,
        dragX.value,
        event.velocityX,
        cardWidth,
        itemCount,
      );

      if (targetIndex === currentIndex) {
        dragX.value = withSpring(0, CARD_STACK_SPRING_BACK);
        return;
      }

      isTransitioning.value = true;
      const exitDragX = getCardStackExitDragX(currentIndex, targetIndex, cardWidth);
      const duration = reduceMotion ? 0 : CARD_STACK_EXIT.duration;

      dragX.value = withTiming(exitDragX, {
        duration,
        easing: Easing.out(Easing.cubic),
      }, (finished) => {
        if (!finished) {
          isTransitioning.value = false;
          return;
        }

        activeIndex.value = targetIndex;
        dragX.value = 0;
        isTransitioning.value = false;
        runOnJS(commitPosition)(targetIndex);
      });
    }), [cardWidth, commitPosition, dragX, gestureActiveOffsetX, gestureEdgeResistance, gestureFailOffsetY, gestureStartX, isTransitioning, itemCount, lastIndex, reduceMotion]);

  if (itemCount === 0) {
    return null;
  }

  return (
    <View style={[styles.host, { width: cardWidth, height: cardHeight + CARD_STACK_PEEK }, style]}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.deck, { width: cardWidth, height: cardHeight + CARD_STACK_PEEK }]}>
          {visibleIndices.map((index) => (
            <StackCardLayer
              key={keyExtractor(items[index], index)}
              cardIndex={index}
              activeIndex={activeIndex}
              dragX={dragX}
              cardWidth={cardWidth}
              reduceMotion={reduceMotion}
            >
              {renderCard(items[index], index)}
            </StackCardLayer>
          ))}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    alignSelf: 'center',
  },
  deck: {
    position: 'relative',
    paddingTop: CARD_STACK_PEEK,
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
