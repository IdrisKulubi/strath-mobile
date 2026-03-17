import React, { useCallback, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { useVibeCheck } from '@/hooks/use-vibe-check';

interface VibeCheckDecisionProps {
    vibeCheckId: string;
    matchId: string;
    partnerFirstName?: string | null;
    partnerPhoto?: string | null;
    onClose?: () => void;
}

export function VibeCheckDecision({
    vibeCheckId,
    matchId,
    partnerFirstName,
    partnerPhoto,
    onClose,
}: VibeCheckDecisionProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const { submitDecision, isSubmittingDecision, vibeCheckResult } =
        useVibeCheck(matchId, vibeCheckId);

    const yesScale = useSharedValue(1);
    const noScale = useSharedValue(1);

    // Celebration bounce when both agreed
    const celebY = useSharedValue(0);
    const celebOpacity = useSharedValue(0);

    useEffect(() => {
        if (vibeCheckResult?.bothAgreedToMeet) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 160);
            celebOpacity.value = withTiming(1, { duration: 300 });
            celebY.value = withSpring(0, { damping: 10, stiffness: 200 });
        }
    }, [vibeCheckResult?.bothAgreedToMeet, celebY, celebOpacity]);

    const handleYes = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        yesScale.value = withSpring(0.93, { damping: 10, stiffness: 300 }, () => {
            yesScale.value = withSpring(1);
        });
        submitDecision({ vibeCheckId, decision: 'meet' });
    }, [vibeCheckId, submitDecision, yesScale]);

    const handleNo = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        noScale.value = withTiming(0.94, { duration: 80 }, () => {
            noScale.value = withSpring(1);
        });
        submitDecision({ vibeCheckId, decision: 'pass' });
    }, [vibeCheckId, submitDecision, noScale]);

    const handleDone = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onClose) {
            onClose();
        } else {
            router.push('/(tabs)/dates');
        }
    }, [onClose, router]);

    const yesAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: yesScale.value }] }));
    const noAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: noScale.value }] }));

    const name = partnerFirstName ?? 'them';
    const userDecision = vibeCheckResult?.userDecision;
    const bothAgreed = vibeCheckResult?.bothAgreedToMeet;
    const bothDecided = vibeCheckResult?.bothDecided;

    // ── Mutual agree ─────────────────────────────────────────────────────────
    if (bothAgreed) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                    <View style={[styles.successIcon, { backgroundColor: 'rgba(233,30,140,0.12)' }]}>
                        <Ionicons name="heart" size={48} color={colors.primary} />
                    </View>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        The vibe is real! 🎉
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        You and {name} both want to meet.{'\n'}StrathSpace will arrange the date.
                    </Text>
                    <View style={[styles.arrangeBox, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderColor: colors.border,
                    }]}>
                        <View style={styles.arrangeDot}>
                            <View style={[styles.dot, { backgroundColor: colors.primary }]} />
                        </View>
                        <Text style={[styles.arrangeText, { color: colors.mutedForeground }]}>
                            Being arranged by StrathSpace — we'll reach out soon.
                        </Text>
                    </View>
                    <Pressable
                        onPress={handleDone}
                        style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.primaryBtnText}>Go to Dates</Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    // ── Waiting for partner ───────────────────────────────────────────────────
    if (userDecision && !bothDecided) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: 8 }} />
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        Waiting on {name}…
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        You said{' '}
                        <Text style={{ color: userDecision === 'meet' ? '#10b981' : colors.mutedForeground, fontWeight: '700' }}>
                            {userDecision === 'meet' ? 'Yes, let\'s meet' : 'Not this time'}
                        </Text>
                        . We'll notify you once {name} responds.
                    </Text>
                    <Pressable onPress={handleDone} style={styles.ghostBtn}>
                        <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
                            Back to Dates
                        </Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    // ── Both decided, no mutual agree ─────────────────────────────────────────
    if (bothDecided && !bothAgreed) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                    <View style={[styles.successIcon, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                        <Ionicons name="hand-left-outline" size={40} color={colors.mutedForeground} />
                    </View>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        No worries
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        Not every vibe leads to a date — and that's okay.{'\n'}Keep exploring 💫
                    </Text>
                    <Pressable onPress={handleDone} style={[styles.primaryBtn, { backgroundColor: colors.primary }]}>
                        <Text style={styles.primaryBtnText}>Back to Dates</Text>
                    </Pressable>
                </Animated.View>
            </View>
        );
    }

    // ── Decision prompt (main state) ─────────────────────────────────────────
    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            <Animated.View entering={FadeInDown.springify().damping(14)} style={styles.center}>
                {/* Photo */}
                <View style={[styles.photoRing, { borderColor: colors.primary }]}>
                    {partnerPhoto ? (
                        <CachedImage uri={partnerPhoto} style={styles.photo} fallbackType="avatar" />
                    ) : (
                        <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.muted }]}>
                            <Ionicons name="person" size={40} color={colors.mutedForeground} />
                        </View>
                    )}
                </View>

                <Text style={[styles.name, { color: colors.foreground }]}>{name}</Text>

                {/* Question */}
                <View style={styles.questionBlock}>
                    <Text style={[styles.heading, { color: colors.foreground }]}>
                        Still open to meeting?
                    </Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>
                        Your answer stays private until both sides decide.
                    </Text>
                </View>

                {/* Buttons */}
                <View style={styles.btnStack}>
                    <Animated.View style={[{ width: '100%' }, yesAnimStyle]}>
                        <Pressable
                            onPress={handleYes}
                            disabled={isSubmittingDecision}
                            style={[
                                styles.primaryBtn,
                                { backgroundColor: colors.primary, opacity: isSubmittingDecision ? 0.7 : 1 },
                            ]}
                        >
                            {isSubmittingDecision ? (
                                <ActivityIndicator size="small" color="#fff" />
                            ) : (
                                <Text style={styles.primaryBtnText}>Yes, I'm in</Text>
                            )}
                        </Pressable>
                    </Animated.View>

                    <Animated.View style={[{ width: '100%' }, noAnimStyle]}>
                        <Pressable
                            onPress={handleNo}
                            disabled={isSubmittingDecision}
                            style={[
                                styles.ghostBtn,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    opacity: isSubmittingDecision ? 0.5 : 1,
                                },
                            ]}
                        >
                            <Text style={[styles.ghostBtnText, { color: colors.mutedForeground }]}>
                                Not really
                            </Text>
                        </Pressable>
                    </Animated.View>
                </View>

            </Animated.View>
        </View>
    );
}

const PHOTO_SIZE = 100;

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        gap: 16,
    },
    photoRing: {
        width: PHOTO_SIZE + 6,
        height: PHOTO_SIZE + 6,
        borderRadius: (PHOTO_SIZE + 6) / 2,
        borderWidth: 3,
        padding: 2,
        overflow: 'hidden',
        marginBottom: 4,
    },
    photo: {
        width: PHOTO_SIZE,
        height: PHOTO_SIZE,
        borderRadius: PHOTO_SIZE / 2,
    },
    photoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    name: {
        fontSize: 20,
        fontWeight: '700',
        marginTop: -8,
    },
    questionBlock: {
        alignItems: 'center',
        gap: 6,
    },
    heading: {
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        letterSpacing: -0.2,
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
    },
    btnStack: {
        width: '100%',
        gap: 10,
        marginTop: 4,
    },
    primaryBtn: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    ghostBtn: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    ghostBtnText: {
        fontSize: 15,
        fontWeight: '600',
    },
    privacyNote: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: -4,
    },
    successIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    arrangeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 12,
        width: '100%',
    },
    arrangeDot: {
        width: 8,
        alignItems: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    arrangeText: {
        flex: 1,
        fontSize: 13,
        lineHeight: 18,
    },
});
