import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Modal,
    View,
    StyleSheet,
    Pressable,
    Platform,
    Animated,
    Easing,
} from 'react-native';
import { useRouter, useSegments } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
    isNudgeEligible,
    markNudgeShown,
    markNudgeDismissed,
} from '@/lib/app-feedback-storage';

const CHECK_DELAY_MS = 4000;

interface AppFeedbackNudgeProps {
    hasAuthToken: boolean;
}

export function AppFeedbackNudge({ hasAuthToken }: AppFeedbackNudgeProps) {
    const { colors, colorScheme } = useTheme();
    const router = useRouter();
    const segments = useSegments();
    const isDark = colorScheme === 'dark';

    const [visible, setVisible] = useState(false);
    const hasCheckedRef = useRef(false);

    const cardTranslate = useRef(new Animated.Value(40)).current;
    const cardOpacity = useRef(new Animated.Value(0)).current;

    // Only consider showing the nudge while the user is in the main tabs
    // (not during auth, onboarding, verification, or intro flows).
    const firstSegment = segments[0] ?? '';
    const isInMainApp = firstSegment === '(tabs)';

    useEffect(() => {
        if (!hasAuthToken || !isInMainApp || hasCheckedRef.current) return;

        hasCheckedRef.current = true;
        let cancelled = false;

        const timer = setTimeout(async () => {
            const { eligible } = await isNudgeEligible();
            if (cancelled || !eligible) return;
            await markNudgeShown();
            setVisible(true);
        }, CHECK_DELAY_MS);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [hasAuthToken, isInMainApp]);

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(cardTranslate, {
                    toValue: 0,
                    duration: 280,
                    easing: Easing.out(Easing.cubic),
                    useNativeDriver: true,
                }),
                Animated.timing(cardOpacity, {
                    toValue: 1,
                    duration: 220,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            cardTranslate.setValue(40);
            cardOpacity.setValue(0);
        }
    }, [visible, cardTranslate, cardOpacity]);

    const close = useCallback(() => {
        setVisible(false);
    }, []);

    const handleShare = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        close();
        // Small delay so the modal dismiss animation can start before navigating
        setTimeout(() => {
            router.push('/app-feedback');
        }, 120);
    }, [close, router]);

    const handleNotNow = useCallback(async () => {
        Haptics.selectionAsync();
        await markNudgeDismissed();
        close();
    }, [close]);

    if (!visible) return null;

    return (
        <Modal
            transparent
            visible={visible}
            animationType="fade"
            onRequestClose={handleNotNow}
            statusBarTranslucent
        >
            <View style={styles.backdrop}>
                <Pressable style={StyleSheet.absoluteFill} onPress={handleNotNow} />

                <Animated.View
                    style={[
                        styles.cardWrap,
                        {
                            opacity: cardOpacity,
                            transform: [{ translateY: cardTranslate }],
                        },
                    ]}
                >
                    <BlurView
                        intensity={Platform.OS === 'ios' ? 60 : 100}
                        tint={isDark ? 'dark' : 'light'}
                        style={[
                            styles.card,
                            {
                                backgroundColor: isDark
                                    ? 'rgba(26,13,46,0.92)'
                                    : 'rgba(255,255,255,0.96)',
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={[styles.iconBubble, { backgroundColor: 'rgba(233,30,140,0.14)' }]}>
                            <Ionicons name="chatbubble-ellipses" size={26} color={colors.primary} />
                        </View>

                        <Text style={[styles.title, { color: colors.foreground }]}>
                            How&apos;s StrathSpace treating you?
                        </Text>

                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                            We&apos;re building this for you. Got a feature idea, bug, or something on your mind? Drop us a quick note — we read every one.
                        </Text>

                        <View style={styles.actions}>
                            <Pressable
                                onPress={handleShare}
                                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.primaryBtnText}>Share feedback</Text>
                            </Pressable>

                            <Pressable onPress={handleNotNow} style={styles.secondaryBtn}>
                                <Text style={[styles.secondaryBtnText, { color: colors.mutedForeground }]}>
                                    Not now
                                </Text>
                            </Pressable>
                        </View>
                    </BlurView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    },
    cardWrap: {
        width: '100%',
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        padding: 22,
        overflow: 'hidden',
        gap: 12,
    },
    iconBubble: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: -0.2,
        lineHeight: 26,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    actions: {
        marginTop: 10,
        gap: 8,
    },
    primaryBtn: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    secondaryBtnText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
