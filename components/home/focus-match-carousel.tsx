import React, { useCallback, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedReaction,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface FocusMatchCarouselProps<T> {
    items: T[];
    keyExtractor: (item: T) => string;
    renderItem: (item: T, index: number) => React.ReactNode;
    onIndexChange?: (index: number) => void;
    initialIndex?: number;
    cardHeight: number;
    itemWidthRatio?: number;
}

function triggerFocusHaptic() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

function CarouselSlide<T>({
    index,
    itemWidth,
    cardHeight,
    scrollX,
    children,
}: {
    index: number;
    itemWidth: number;
    cardHeight: number;
    scrollX: Animated.SharedValue<number>;
    children: React.ReactNode;
}) {
    const animatedStyle = useAnimatedStyle(() => {
        const inputRange = [(index - 1) * itemWidth, index * itemWidth, (index + 1) * itemWidth];
        const scale = interpolate(scrollX.value, inputRange, [0.88, 1, 0.88], Extrapolation.CLAMP);
        const opacity = interpolate(scrollX.value, inputRange, [0.45, 1, 0.45], Extrapolation.CLAMP);
        return {
            transform: [{ scale }],
            opacity,
        };
    });

    return (
        <Animated.View style={[{ width: itemWidth, height: cardHeight }, animatedStyle]}>
            {children}
        </Animated.View>
    );
}

export function FocusMatchCarousel<T>({
    items,
    keyExtractor,
    renderItem,
    onIndexChange,
    initialIndex = 0,
    cardHeight,
    itemWidthRatio = 0.86,
}: FocusMatchCarouselProps<T>) {
    const { width: screenWidth } = useWindowDimensions();
    const { colors, isDark } = useTheme();
    const itemWidth = screenWidth * itemWidthRatio;
    const sidePadding = (screenWidth - itemWidth) / 2;
    const scrollX = useSharedValue(initialIndex * itemWidth);
    const listRef = useRef<Animated.FlatList<T>>(null);
    const [activeIndex, setActiveIndex] = useState(() =>
        Math.min(Math.max(0, initialIndex), Math.max(0, items.length - 1)),
    );

    const notifyIndexChange = useCallback(
        (index: number) => {
            setActiveIndex(index);
            onIndexChange?.(index);
        },
        [onIndexChange],
    );

    useAnimatedReaction(
        () => Math.round(scrollX.value / itemWidth),
        (current, previous) => {
            if (previous === null) return;
            if (current === previous || current < 0 || current >= items.length) return;
            runOnJS(triggerFocusHaptic)();
            runOnJS(notifyIndexChange)(current);
        },
        [itemWidth, items.length, notifyIndexChange],
    );

    const onScroll = useAnimatedScrollHandler({
        onScroll: (event) => {
            scrollX.value = event.contentOffset.x;
        },
    });

    if (items.length === 0) {
        return null;
    }

    return (
        <View style={[styles.wrap, { height: cardHeight + 52 }]}>
            <Animated.FlatList
                ref={listRef}
                data={items}
                horizontal
                keyExtractor={keyExtractor}
                showsHorizontalScrollIndicator={false}
                decelerationRate="fast"
                snapToInterval={itemWidth}
                snapToAlignment="start"
                disableIntervalMomentum
                bounces={false}
                style={{ height: cardHeight }}
                contentContainerStyle={{ paddingHorizontal: sidePadding, alignItems: 'center' }}
                onScroll={onScroll}
                scrollEventThrottle={16}
                initialScrollIndex={items.length > 0 ? activeIndex : undefined}
                getItemLayout={(_, index) => ({
                    length: itemWidth,
                    offset: itemWidth * index,
                    index,
                })}
                renderItem={({ item, index }) => (
                    <CarouselSlide
                        index={index}
                        itemWidth={itemWidth}
                        cardHeight={cardHeight}
                        scrollX={scrollX}
                    >
                        {renderItem(item, index)}
                    </CarouselSlide>
                )}
            />

            {items.length > 1 ? (
                <View style={styles.footer}>
                    <View style={styles.dots}>
                        {items.map((item, index) => (
                            <View
                                key={keyExtractor(item)}
                                style={[
                                    styles.dot,
                                    {
                                        backgroundColor:
                                            index === activeIndex
                                                ? colors.primary
                                                : isDark
                                                  ? colors.border
                                                  : colors.mutedForeground,
                                        opacity: index === activeIndex ? 1 : isDark ? 0.55 : 0.28,
                                        width: index === activeIndex ? 7 : 6,
                                    },
                                ]}
                            />
                        ))}
                    </View>
                    <Text variant="muted" style={{ color: colors.mutedForeground }}>
                        {activeIndex + 1} / {items.length}
                    </Text>
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        flexGrow: 1,
    },
    footer: {
        alignItems: 'center',
        gap: SPACING.tight,
        paddingTop: SPACING.compact,
        paddingBottom: SPACING.tight,
    },
    dots: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
});
