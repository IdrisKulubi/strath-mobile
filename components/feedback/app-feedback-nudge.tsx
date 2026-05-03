import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    Animated,
    Easing,
    PanResponder,
    Platform,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
    markDailyFeedbackPromptShown,
    shouldShowDailyFeedbackPrompt,
} from '@/lib/app-feedback-storage';

const SHOW_DELAY_MS = 1000;
const HIDDEN_OFFSET = 220;
const DISMISS_DRAG_Y = 48;
const DISMISS_VELOCITY_Y = 0.7;

interface AppFeedbackNudgeProps {
    hasAuthToken: boolean;
}

export function AppFeedbackNudge({ hasAuthToken }: AppFeedbackNudgeProps) {
    const { colors, colorScheme } = useTheme();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    const segments = useSegments();
    const isDark = colorScheme === 'dark';

    const [visible, setVisible] = useState(false);
    const checkedRef = useRef(false);
    const openedRef = useRef(false);
    const dismissedRef = useRef(false);
    const translateY = useRef(new Animated.Value(HIDDEN_OFFSET)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    const firstSegment = segments[0] ?? '';
    const isInMainApp = firstSegment === '(tabs)';

    const hide = useCallback((afterHide?: () => void) => {
        Animated.parallel([
            Animated.timing(translateY, {
                toValue: HIDDEN_OFFSET,
                duration: 260,
                easing: Easing.in(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 0,
                duration: 180,
                easing: Easing.in(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start(({ finished }) => {
            if (finished) {
                setVisible(false);
                afterHide?.();
            }
        });
    }, [opacity, translateY]);

    const dismiss = useCallback(() => {
        if (dismissedRef.current) return;
        dismissedRef.current = true;
        Haptics.selectionAsync();
        hide();
    }, [hide]);

    const panResponder = useMemo(
        () => PanResponder.create({
            onMoveShouldSetPanResponder: (_, gestureState) => (
                Math.abs(gestureState.dy) > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx)
            ),
            onPanResponderMove: (_, gestureState) => {
                translateY.setValue(Math.max(0, gestureState.dy));
            },
            onPanResponderRelease: (_, gestureState) => {
                const shouldDismiss = gestureState.dy > DISMISS_DRAG_Y || gestureState.vy > DISMISS_VELOCITY_Y;

                if (shouldDismiss) {
                    dismiss();
                    return;
                }

                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 18,
                    stiffness: 180,
                    mass: 0.8,
                    useNativeDriver: true,
                }).start();
            },
            onPanResponderTerminate: () => {
                Animated.spring(translateY, {
                    toValue: 0,
                    damping: 18,
                    stiffness: 180,
                    mass: 0.8,
                    useNativeDriver: true,
                }).start();
            },
        }),
        [dismiss, translateY]
    );

    useEffect(() => {
        if (!hasAuthToken || !isInMainApp || checkedRef.current) return;

        checkedRef.current = true;
        let cancelled = false;

        const timer = setTimeout(async () => {
            const shouldShow = await shouldShowDailyFeedbackPrompt();
            if (cancelled || !shouldShow) return;

            await markDailyFeedbackPromptShown();
            setVisible(true);
        }, SHOW_DELAY_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [hasAuthToken, isInMainApp]);

    useEffect(() => {
        if (!visible) return;

        dismissedRef.current = false;
        translateY.setValue(HIDDEN_OFFSET);
        opacity.setValue(0);

        Animated.parallel([
            Animated.spring(translateY, {
                toValue: 0,
                damping: 17,
                stiffness: 170,
                mass: 0.85,
                useNativeDriver: true,
            }),
            Animated.timing(opacity, {
                toValue: 1,
                duration: 180,
                easing: Easing.out(Easing.quad),
                useNativeDriver: true,
            }),
        ]).start();
    }, [visible, opacity, translateY]);

    const handleOpenFeedback = useCallback(() => {
        if (openedRef.current) return;
        openedRef.current = true;
        dismissedRef.current = true;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        hide(() => {
            router.push('/app-feedback');
            openedRef.current = false;
        });
    }, [hide, router]);

    if (!visible || !hasAuthToken || !isInMainApp) {
        return null;
    }

    return (
        <Animated.View
            pointerEvents="box-none"
            style={[
                styles.wrap,
                {
                    paddingBottom: Math.max(insets.bottom, 10) + 84,
                    opacity,
                    transform: [{ translateY }],
                },
            ]}
        >
            <Animated.View
                style={styles.sheetShadow}
                {...panResponder.panHandlers}
            >
                <BlurView
                    intensity={Platform.OS === 'ios' ? 56 : 90}
                    tint={isDark ? 'dark' : 'light'}
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: isDark
                                ? 'rgba(38,25,59,0.96)'
                                : 'rgba(255,255,255,0.97)',
                            borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.08)',
                        },
                    ]}
                >
                    <View style={[styles.handle, { backgroundColor: colors.mutedForeground }]} />

                    <View style={styles.contentRow}>
                        <View style={[styles.iconBubble, { backgroundColor: colors.primary }]}>
                            <Ionicons name="chatbubble-ellipses" size={21} color="#fff" />
                        </View>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Send feedback"
                            onPress={handleOpenFeedback}
                            style={({ pressed }) => [
                                styles.copyButton,
                                { opacity: pressed ? 0.78 : 1 },
                            ]}
                        >
                            <Text numberOfLines={1} style={[styles.title, { color: colors.foreground }]}>
                                Got feedback for us?
                            </Text>
                            <Text numberOfLines={2} style={[styles.subtitle, { color: colors.mutedForeground }]}>
                                Tell us what feels off or we should improve.
                            </Text>
                        </Pressable>

                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Dismiss feedback prompt"
                            hitSlop={10}
                            onPress={dismiss}
                            style={styles.closeButton}
                        >
                            <Ionicons name="close" size={19} color={colors.mutedForeground} />
                        </Pressable>
                    </View>
                </BlurView>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 60,
        elevation: 60,
        paddingHorizontal: 14,
    },
    sheetShadow: {
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.24,
        shadowRadius: 20,
        elevation: 10,
    },
    sheet: {
        minHeight: 92,
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
        paddingHorizontal: 14,
        paddingTop: 9,
        paddingBottom: 14,
    },
    handle: {
        width: 42,
        height: 4,
        borderRadius: 2,
        opacity: 0.36,
        alignSelf: 'center',
        marginBottom: 11,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBubble: {
        width: 44,
        height: 44,
        borderRadius: 22,
        alignItems: 'center',
        justifyContent: 'center',
    },
    copyButton: {
        flex: 1,
        minWidth: 0,
        gap: 3,
    },
    title: {
        fontSize: 16,
        fontWeight: '800',
        lineHeight: 20,
    },
    subtitle: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    closeButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
