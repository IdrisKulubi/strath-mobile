import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BottomTabBarHeightCallbackContext } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useContext } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';

export const GLASS_TAB_BAR_PILL_HEIGHT = 62;
export const GLASS_TAB_BAR_BOTTOM_GAP = SPACING.tight;

export function getGlassTabBarHeight(bottomInset = Platform.OS === 'ios' ? 34 : 14): number {
    return GLASS_TAB_BAR_PILL_HEIGHT + GLASS_TAB_BAR_BOTTOM_GAP + bottomInset;
}

type TabOptions = BottomTabBarProps['descriptors'][string]['options'] & {
    href?: string | null;
};

function isRouteVisible(options: TabOptions): boolean {
    if (options.href === null) return false;
    const itemStyle = options.tabBarItemStyle;
    if (itemStyle && typeof itemStyle === 'object' && !Array.isArray(itemStyle) && itemStyle.display === 'none') {
        return false;
    }
    return true;
}

function getTabLabel(options: TabOptions, routeName: string): string {
    if (typeof options.tabBarLabel === 'string') return options.tabBarLabel;
    if (typeof options.title === 'string') return options.title;
    return routeName;
}

function getBadgeText(badge: TabOptions['tabBarBadge']): string | null {
    if (badge === undefined || badge === null || badge === false || badge === '') return null;
    return String(badge);
}

export function GlassTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
    const { colors, isDark } = useTheme();
    const onHeightChange = useContext(BottomTabBarHeightCallbackContext);
    const glassFill = isDark ? 'rgba(28, 23, 36, 0.55)' : 'rgba(255, 255, 255, 0.72)';
    const glassBorder = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    const activePill = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)';
    const androidFill = isDark ? 'rgba(28, 23, 36, 0.82)' : 'rgba(255, 255, 255, 0.92)';

    const visibleRoutes = state.routes.filter((route) => isRouteVisible(descriptors[route.key].options));

    return (
        <View
            pointerEvents="box-none"
            onLayout={(event) => {
                onHeightChange?.(event.nativeEvent.layout.height);
            }}
            style={[
                styles.host,
                {
                    paddingBottom: insets.bottom + GLASS_TAB_BAR_BOTTOM_GAP,
                    paddingHorizontal: SPACING.base,
                },
            ]}
        >
            <View style={styles.pillShadow}>
                <BlurView
                    intensity={Platform.OS === 'ios' ? 50 : 80}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                        styles.pill,
                        {
                            backgroundColor: Platform.OS === 'android' ? androidFill : glassFill,
                            borderColor: glassBorder,
                        },
                    ]}
                >
                    <View style={styles.tabRow}>
                        {visibleRoutes.map((route) => {
                            const { options } = descriptors[route.key];
                            const routeIndex = state.routes.findIndex((r) => r.key === route.key);
                            const isFocused = state.index === routeIndex;
                            const label = getTabLabel(options, route.name);
                            const activeColor = options.tabBarActiveTintColor ?? colors.primary;
                            const inactiveColor = options.tabBarInactiveTintColor ?? colors.tabIconDefault;
                            const color = isFocused ? activeColor : inactiveColor;
                            const badgeText = getBadgeText(options.tabBarBadge);
                            const badgeStyle = options.tabBarBadgeStyle;

                            const onPress = () => {
                                const event = navigation.emit({
                                    type: 'tabPress',
                                    target: route.key,
                                    canPreventDefault: true,
                                });

                                if (!isFocused && !event.defaultPrevented) {
                                    navigation.navigate(route.name, route.params);
                                }
                            };

                            const onLongPress = () => {
                                navigation.emit({
                                    type: 'tabLongPress',
                                    target: route.key,
                                });
                            };

                            const onPressIn = () => {
                                if (process.env.EXPO_OS === 'ios') {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                }
                            };

                            const icon = options.tabBarIcon?.({
                                focused: isFocused,
                                color,
                                size: 24,
                            });

                            return (
                                <Pressable
                                    key={route.key}
                                    accessibilityRole="button"
                                    accessibilityState={isFocused ? { selected: true } : {}}
                                    accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                                    onPress={onPress}
                                    onLongPress={onLongPress}
                                    onPressIn={onPressIn}
                                    style={styles.tabPressable}
                                >
                                    <View
                                        style={[
                                            styles.tabItem,
                                            isFocused ? { backgroundColor: activePill } : null,
                                        ]}
                                    >
                                        <View style={styles.iconWrap}>
                                            {icon ?? null}
                                            {badgeText ? (
                                                <View
                                                    style={[
                                                        styles.badge,
                                                        {
                                                            backgroundColor:
                                                                (badgeStyle as { backgroundColor?: string })
                                                                    ?.backgroundColor ?? colors.primary,
                                                        },
                                                    ]}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.badgeText,
                                                            {
                                                                color:
                                                                    (badgeStyle as { color?: string })?.color ??
                                                                    colors.primaryForeground,
                                                            },
                                                        ]}
                                                    >
                                                        {badgeText}
                                                    </Text>
                                                </View>
                                            ) : null}
                                        </View>
                                        {options.tabBarShowLabel !== false ? (
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.label,
                                                    { color },
                                                    isFocused ? styles.labelActive : null,
                                                ]}
                                            >
                                                {label}
                                            </Text>
                                        ) : null}
                                    </View>
                                </Pressable>
                            );
                        })}
                    </View>
                </BlurView>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
    },
    pillShadow: {
        borderRadius: RADIUS.full,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.18,
        shadowRadius: 16,
        elevation: 12,
    },
    pill: {
        minHeight: GLASS_TAB_BAR_PILL_HEIGHT,
        borderRadius: RADIUS.full,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    tabRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: SPACING.micro,
        paddingVertical: SPACING.micro,
    },
    tabPressable: {
        flex: 1,
    },
    tabItem: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: SPACING.tight,
        paddingHorizontal: SPACING.micro,
        borderRadius: 20,
        minHeight: 54,
    },
    iconWrap: {
        position: 'relative',
        alignItems: 'center',
        justifyContent: 'center',
        width: 28,
        height: 28,
    },
    label: {
        fontSize: 10,
        fontWeight: '500',
        marginTop: 2,
        textAlign: 'center',
    },
    labelActive: {
        fontWeight: '600',
    },
    badge: {
        position: 'absolute',
        top: -4,
        right: -10,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '600',
    },
});
