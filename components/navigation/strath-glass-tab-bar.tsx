import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import type { TabListProps, TabTriggerSlotProps } from 'expo-router/ui';
import {
    Children,
    createContext,
    use,
    useCallback,
    useEffect,
    useMemo,
    type ReactNode,
} from 'react';
import { Platform, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    interpolateColor,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { setMinimized, useMinimizeState } from 'expo-glass-tabs/build/minimize-context';

const AnimatedGlassView = Animated.createAnimatedComponent(GlassView);

const EXPANDED_HEIGHT = 58;
const MINIMIZED_HEIGHT = 44;
const MINIMIZED_INSET = 34;
const BAR_MARGIN = 12;
const ROW_PAD_H = 4;
const LABEL_HEIGHT = 13;
const ICON_SIZE = 21;
const ITEM_GAP = 2;
const LABEL_BLOCK = LABEL_HEIGHT + ITEM_GAP;
const ITEM_PAD_V = 7;
const HIGHLIGHT_EXPANDED = ICON_SIZE + LABEL_BLOCK + ITEM_PAD_V * 2;
const HIGHLIGHT_MINIMIZED = ICON_SIZE + ITEM_PAD_V * 2;
const SLIDE_SPRING = { duration: 420, dampingRatio: 0.82 };

export type GlassTabBarTheme = {
    activeTint: string;
    inactiveTint: string;
    highlight: string;
    glassTint: string;
    solidFallback: string;
};

const DEFAULT_THEME: GlassTabBarTheme = {
    activeTint: '#FFFFFF',
    inactiveTint: '#9E9EA6',
    highlight: 'rgba(255,255,255,0.14)',
    glassTint: 'rgba(10,10,12,0.55)',
    solidFallback: 'rgba(18,18,20,0.94)',
};

export type GlassTabItem = {
    name: string;
    label: string;
    icon?: SymbolViewProps['name'];
    renderIcon?: (props: { tint: string; size: number }) => ReactNode;
};

type BarContextValue = {
    slideIndex: SharedValue<number>;
    isDragging: SharedValue<boolean>;
    theme: GlassTabBarTheme;
};

const BarContext = createContext<BarContextValue | null>(null);

export type StrathGlassTabBarProps = TabListProps & {
    onIndexSelected?: (index: number) => void;
    theme?: Partial<GlassTabBarTheme>;
    haptics?: boolean;
};

/** Local fork of expo-glass-tabs bar without the dark ProgressiveBlur edge shadow. */
export function StrathGlassTabBar({
    children,
    onIndexSelected,
    theme: themeOverrides,
    haptics = true,
    ...props
}: StrathGlassTabBarProps) {
    const insets = useSafeAreaInsets();
    const { width: windowWidth } = useWindowDimensions();
    const minimized = useMinimizeState();
    const progress = minimized.progress;
    const slideIndex = useSharedValue(0);
    const isDragging = useSharedValue(false);
    const lastTicked = useSharedValue(-1);
    const tabCount = Math.max(Children.count(children), 1);
    const theme = useMemo(() => ({ ...DEFAULT_THEME, ...themeOverrides }), [themeOverrides]);

    const tick = useCallback(() => {
        if (haptics && Platform.OS === 'ios') {
            Haptics.selectionAsync();
        }
    }, [haptics]);

    const selectIndex = useCallback((index: number) => onIndexSelected?.(index), [onIndexSelected]);

    const gesture = useMemo(() => {
        const indexAtX = (x: number, minimizedValue: number) => {
            'worklet';
            const sideInset = interpolate(minimizedValue, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP);
            const barWidth = windowWidth - BAR_MARGIN * 2 - sideInset * 2;
            const itemWidth = (barWidth - ROW_PAD_H * 2) / tabCount;
            const raw = (x - ROW_PAD_H) / itemWidth - 0.5;
            return Math.min(Math.max(raw, 0), tabCount - 1);
        };

        const pan = Gesture.Pan()
            .activeOffsetX([-6, 6])
            .failOffsetY([-14, 14])
            .onStart(() => {
                isDragging.value = true;
                lastTicked.value = Math.round(slideIndex.value);
                setMinimized(minimized, 0);
            })
            .onUpdate((event) => {
                const index = indexAtX(event.x, progress.value);
                slideIndex.value = index;
                const rounded = Math.round(index);
                if (rounded !== lastTicked.value) {
                    lastTicked.value = rounded;
                    runOnJS(tick)();
                }
            })
            .onFinalize(() => {
                if (!isDragging.value) {
                    return;
                }
                const rounded = Math.round(slideIndex.value);
                slideIndex.value = withSpring(rounded, SLIDE_SPRING);
                runOnJS(selectIndex)(rounded);
                isDragging.value = false;
            });

        const tap = Gesture.Tap()
            .maxDistance(16)
            .maxDuration(400)
            .onEnd((event, success) => {
                if (!success) {
                    return;
                }
                const index = Math.round(indexAtX(event.x, progress.value));
                slideIndex.value = withSpring(index, SLIDE_SPRING);
                setMinimized(minimized, 0);
                runOnJS(selectIndex)(index);
            });

        return Gesture.Race(pan, tap);
    }, [windowWidth, tabCount, selectIndex, tick, isDragging, lastTicked, slideIndex, minimized, progress]);

    const barStyle = useAnimatedStyle(() => {
        const height = interpolate(progress.value, [0, 1], [EXPANDED_HEIGHT, MINIMIZED_HEIGHT], Extrapolation.CLAMP);
        return {
            height,
            marginHorizontal: interpolate(progress.value, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP),
        };
    });

    const shapeStyle = useAnimatedStyle(() => {
        const height = interpolate(progress.value, [0, 1], [EXPANDED_HEIGHT, MINIMIZED_HEIGHT], Extrapolation.CLAMP);
        return { borderRadius: height / 2 };
    });

    const highlightStyle = useAnimatedStyle(() => {
        const barHeight = interpolate(progress.value, [0, 1], [EXPANDED_HEIGHT, MINIMIZED_HEIGHT], Extrapolation.CLAMP);
        const height = interpolate(progress.value, [0, 1], [HIGHLIGHT_EXPANDED, HIGHLIGHT_MINIMIZED], Extrapolation.CLAMP);
        const sideInset = interpolate(progress.value, [0, 1], [0, MINIMIZED_INSET], Extrapolation.CLAMP);
        const barWidth = windowWidth - BAR_MARGIN * 2 - sideInset * 2;
        const itemWidth = (barWidth - ROW_PAD_H * 2) / tabCount;
        return {
            height,
            width: itemWidth,
            borderRadius: height / 2,
            top: (barHeight - height) / 2,
            transform: [{ translateX: ROW_PAD_H + itemWidth * slideIndex.value }],
        };
    });

    const bottomOffset = Math.max(insets.bottom - 16, 12);
    const barContext = useMemo(() => ({ slideIndex, isDragging, theme }), [slideIndex, isDragging, theme]);

    return (
        <View {...props} pointerEvents="box-none" style={styles.host}>
            <View pointerEvents="box-none" style={{ marginHorizontal: BAR_MARGIN, marginBottom: bottomOffset }}>
                <GestureDetector gesture={gesture}>
                    <Animated.View style={barStyle}>
                        {isLiquidGlassAvailable() ? (
                            <AnimatedGlassView
                                glassEffectStyle="regular"
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: theme.glassTint, borderCurve: 'continuous' },
                                    shapeStyle,
                                ]}
                            />
                        ) : (
                            <Animated.View
                                style={[
                                    StyleSheet.absoluteFill,
                                    { backgroundColor: theme.solidFallback, borderCurve: 'continuous' },
                                    shapeStyle,
                                ]}
                            />
                        )}
                        <Animated.View
                            style={[
                                {
                                    position: 'absolute',
                                    left: 0,
                                    backgroundColor: theme.highlight,
                                    borderCurve: 'continuous',
                                },
                                highlightStyle,
                            ]}
                        />
                        <View style={styles.tabRow}>
                            <BarContext.Provider value={barContext}>{children}</BarContext.Provider>
                        </View>
                    </Animated.View>
                </GestureDetector>
            </View>
        </View>
    );
}

function TabGlyph({ item, tint }: { item: GlassTabItem; tint: string }) {
    if (item.renderIcon) {
        return (
            <View style={styles.glyphWrap}>
                {item.renderIcon({ tint, size: ICON_SIZE })}
            </View>
        );
    }
    if (item.icon) {
        return <SymbolView name={item.icon} tintColor={tint} size={ICON_SIZE} weight="semibold" />;
    }
    return null;
}

export function StrathGlassTabButton({
    item,
    index,
    isFocused,
    onPress,
    ...props
}: TabTriggerSlotProps & { item: GlassTabItem; index: number }) {
    const minimized = useMinimizeState();
    const progress = minimized.progress;
    const bar = use(BarContext);
    const theme = bar?.theme ?? DEFAULT_THEME;
    const slideIndex = bar?.slideIndex;

    useEffect(() => {
        if (isFocused && bar && !bar.isDragging.value) {
            bar.slideIndex.value = withSpring(index, SLIDE_SPRING);
        }
    }, [isFocused, index, bar]);

    const activeGlyphStyle = useAnimatedStyle(() => ({
        opacity: slideIndex ? 1 - Math.min(Math.abs(slideIndex.value - index), 1) : isFocused ? 1 : 0,
    }));

    const labelStyle = useAnimatedStyle(() => ({
        opacity: interpolate(progress.value, [0, 0.4], [1, 0], Extrapolation.CLAMP),
        color: slideIndex
            ? interpolateColor(
                  Math.min(Math.abs(slideIndex.value - index), 1),
                  [0, 1],
                  [theme.activeTint, theme.inactiveTint],
              )
            : isFocused
              ? theme.activeTint
              : theme.inactiveTint,
    }));

    const boxStyle = useAnimatedStyle(() => ({
        height: interpolate(progress.value, [0, 1], [HIGHLIGHT_EXPANDED, HIGHLIGHT_MINIMIZED], Extrapolation.CLAMP),
    }));

    return (
        <Pressable
            {...props}
            onPress={(event) => {
                if (bar) bar.slideIndex.value = withSpring(index, SLIDE_SPRING);
                setMinimized(minimized, 0);
                onPress?.(event);
            }}
            style={styles.tabPressable}
        >
            <Animated.View style={[styles.tabButton, boxStyle]}>
                <View>
                    <TabGlyph item={item} tint={theme.inactiveTint} />
                    <Animated.View style={[StyleSheet.absoluteFill, styles.glyphOverlay, activeGlyphStyle]}>
                        <TabGlyph item={item} tint={theme.activeTint} />
                    </Animated.View>
                </View>
                <Animated.Text numberOfLines={1} style={[styles.label, labelStyle]}>
                    {item.label}
                </Animated.Text>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    tabRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: ROW_PAD_H,
    },
    tabPressable: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tabButton: {
        alignSelf: 'stretch',
        alignItems: 'center',
        paddingTop: ITEM_PAD_V,
        overflow: 'hidden',
    },
    glyphWrap: {
        height: ICON_SIZE,
        justifyContent: 'center',
    },
    glyphOverlay: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        fontSize: 9.5,
        fontWeight: '600',
        marginTop: ITEM_GAP,
    },
});
