import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolation,
    useDerivedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SwipeCard } from './swipe-card';
import { DiscoverProfile } from '@/hooks/use-discover';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const ROTATION_FACTOR = 10; // degrees per 100px

interface CardStackProps {
    profiles: DiscoverProfile[];
    onSwipe?: (action: 'like' | 'pass') => void;
    onInfoPress?: (profile: DiscoverProfile) => void;
    showAura?: boolean;
}

export function CardStack({ profiles, onSwipe, onInfoPress, showAura = false }: CardStackProps) {
    // Shared values for the top card animation
    const translateX = useSharedValue(0);
    const translateY = useSharedValue(0);
    const rotation = useSharedValue(0);
    const scale = useSharedValue(1);

    // Spring config for smooth animations
    const springConfig = {
        damping: 15,
        stiffness: 150,
        mass: 0.6,
    };

    // Handle swipe completion
    const completeSwipe = useCallback((direction: 'like' | 'pass') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSwipe?.(direction);

        // Reset values after swipe
        setTimeout(() => {
            translateX.value = 0;
            translateY.value = 0;
            rotation.value = 0;
            scale.value = 1;
        }, 100);
    }, [onSwipe, translateX, translateY, rotation, scale]);

    // Pan gesture for swiping
    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10]) // Only activate for horizontal movement
        .failOffsetY([-20, 20]) // Fail if vertical movement is significant
        .onStart(() => {
            scale.value = withSpring(1.02, springConfig);
        })
        .onUpdate((event: any) => {
            translateX.value = event.translationX;
            translateY.value = event.translationY * 0.2; // Heavily dampen vertical movement
            rotation.value = (event.translationX / SCREEN_WIDTH) * ROTATION_FACTOR;
        })
        .onEnd((event: any) => {
            const shouldSwipeRight = event.translationX > SWIPE_THRESHOLD;
            const shouldSwipeLeft = event.translationX < -SWIPE_THRESHOLD;

            if (shouldSwipeRight) {
                // Swipe right - LIKE
                translateX.value = withTiming(SCREEN_WIDTH * 1.5, { duration: 250 });
                rotation.value = withTiming(ROTATION_FACTOR * 1.5, { duration: 250 });
                runOnJS(completeSwipe)('like');
            } else if (shouldSwipeLeft) {
                // Swipe left - PASS
                translateX.value = withTiming(-SCREEN_WIDTH * 1.5, { duration: 250 });
                rotation.value = withTiming(-ROTATION_FACTOR * 1.5, { duration: 250 });
                runOnJS(completeSwipe)('pass');
            } else {
                // Spring back to center
                translateX.value = withSpring(0, springConfig);
                translateY.value = withSpring(0, springConfig);
                rotation.value = withSpring(0, springConfig);
                scale.value = withSpring(1, springConfig);
            }
        });

    // Animated style for top card
    const topCardStyle = useAnimatedStyle(() => {
        return {
            transform: [
                { translateX: translateX.value },
                { translateY: translateY.value },
                { rotate: `${rotation.value}deg` },
                { scale: scale.value },
            ],
        };
    });

    // Derived values for opacity (0 to 1)
    const likeOpacityValue = useDerivedValue(() => {
        return interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        );
    });

    const nopeOpacityValue = useDerivedValue(() => {
        return interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD, 0],
            [1, 0],
            Extrapolation.CLAMP
        );
    });

    // Animated styles for background cards
    const secondCardStyle = useAnimatedStyle(() => {
        const scaleValue = interpolate(
            Math.abs(translateX.value),
            [0, SWIPE_THRESHOLD],
            [0.95, 1],
            Extrapolation.CLAMP
        );
        const translateYValue = interpolate(
            Math.abs(translateX.value),
            [0, SWIPE_THRESHOLD],
            [10, 0],
            Extrapolation.CLAMP
        );
        return {
            transform: [
                { scale: scaleValue },
                { translateY: translateYValue },
            ],
        };
    });

    const thirdCardStyle = useAnimatedStyle(() => {
        const scaleValue = interpolate(
            Math.abs(translateX.value),
            [0, SWIPE_THRESHOLD],
            [0.9, 0.95],
            Extrapolation.CLAMP
        );
        const translateYValue = interpolate(
            Math.abs(translateX.value),
            [0, SWIPE_THRESHOLD],
            [20, 10],
            Extrapolation.CLAMP
        );
        return {
            transform: [
                { scale: scaleValue },
                { translateY: translateYValue },
            ],
        };
    });

    if (profiles.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            {/* Third card (bottom) */}
            {profiles[2] && (
                <Animated.View style={[styles.cardContainer, styles.backgroundCard, thirdCardStyle]}>
                    <SwipeCard
                        profile={profiles[2]}
                        onInfoPress={() => onInfoPress?.(profiles[2])}
                    />
                </Animated.View>
            )}

            {/* Second card (middle) */}
            {profiles[1] && (
                <Animated.View style={[styles.cardContainer, styles.backgroundCard, secondCardStyle]}>
                    <SwipeCard
                        profile={profiles[1]}
                        onInfoPress={() => onInfoPress?.(profiles[1])}
                    />
                </Animated.View>
            )}

            {/* Top card (interactive) */}
            {profiles[0] && (
                <GestureDetector gesture={panGesture}>
                    <Animated.View style={[styles.cardContainer, topCardStyle]}>
                        <SwipeCard
                            profile={profiles[0]}
                            onInfoPress={() => onInfoPress?.(profiles[0])}
                            isTop={true}
                            showAura={showAura}
                            likeOpacity={likeOpacityValue}
                            nopeOpacity={nopeOpacityValue}
                        />
                    </Animated.View>
                </GestureDetector>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardContainer: {
        position: 'absolute',
    },
    backgroundCard: {
        zIndex: -1,
    },
});
