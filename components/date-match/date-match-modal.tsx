import React, { useCallback, useEffect, useRef } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    Dimensions,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    withDelay,
    FadeIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useStartMutualMatchCall } from '@/hooks/use-date-requests';
import { MatchPhotosAnimation } from './match-photos-animation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DateMatchModalProps {
    visible: boolean;
    matchId?: string;
    callMatchId?: string;
    theirFirstName: string;
    theirPhoto?: string | null;
    myPhoto?: string | null;
    onClose: () => void;
}

export function DateMatchModal({
    visible,
    matchId,
    callMatchId,
    theirFirstName,
    theirPhoto,
    myPhoto,
    onClose,
}: DateMatchModalProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const toast = useToast();
    const { mutateAsync: startMutualMatchCall, isPending: isStartingCall } = useStartMutualMatchCall();

    const opacity = useSharedValue(0);
    const contentY = useSharedValue(40);
    const contentOpacity = useSharedValue(0);
    const btnScale = useSharedValue(1);

    const firedHaptic = useRef(false);

    useEffect(() => {
        if (visible) {
            firedHaptic.current = false;
            opacity.value = withTiming(1, { duration: 260 });
            contentY.value = withDelay(180, withSpring(0, { damping: 18, stiffness: 200 }));
            contentOpacity.value = withDelay(180, withTiming(1, { duration: 280 }));

            // Success haptic burst when modal appears
            setTimeout(() => {
                if (!firedHaptic.current) {
                    firedHaptic.current = true;
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy), 180);
                }
            }, 200);
        } else {
            opacity.value = withTiming(0, { duration: 200 });
            contentY.value = withTiming(40, { duration: 180 });
            contentOpacity.value = withTiming(0, { duration: 180 });
        }
    }, [visible, opacity, contentY, contentOpacity]);

    const backdropStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
    const contentStyle = useAnimatedStyle(() => ({
        opacity: contentOpacity.value,
        transform: [{ translateY: contentY.value }],
    }));
    const btnAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: btnScale.value }] }));

    const handleStartCall = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        btnScale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            btnScale.value = withSpring(1);
        });

        const start = async () => {
            try {
                if (matchId && !callMatchId) {
                    const result = await startMutualMatchCall(matchId);
                    if (result.partnerAvailability === 'online') {
                        toast.show({ message: 'They look online. Starting your vibe check now.', variant: 'success' });
                    } else if (result.notificationSent) {
                        toast.show({ message: 'They are not online right now. We sent them a call notification.', variant: 'default' });
                    } else {
                        toast.show({ message: 'They are offline right now. You can still start and try again later.', variant: 'warning' });
                    }

                    onClose();
                    router.push(`/vibe-check/${result.matchId}?mode=caller`);
                    return;
                }

                if (!callMatchId) {
                    throw new Error('Call is not ready yet');
                }

                onClose();
                router.push(`/vibe-check/${callMatchId}?mode=caller`);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unable to start the call right now';
                toast.show({ message, variant: 'danger' });
            }
        };

        start();
    }, [btnScale, callMatchId, matchId, onClose, router, startMutualMatchCall, toast]);

    const handleSkip = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/(tabs)/dates');
    }, [onClose, router]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            {/* Dark backdrop */}
            <Animated.View style={[styles.backdrop, backdropStyle]} />

            {/* Content */}
            <View style={styles.root}>
                <Animated.View
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? colors.card : '#fff',
                            borderColor: isDark ? colors.border : 'transparent',
                        },
                        contentStyle,
                    ]}
                >
                    {/* Confetti dots (pure CSS/RN decorative circles) */}
                    <View style={styles.confettiWrap} pointerEvents="none">
                        {CONFETTI_DOTS.map((dot, i) => (
                            <Animated.View
                                key={i}
                                entering={FadeIn.delay(300 + i * 40).duration(400)}
                                style={[styles.confettiDot, {
                                    top: dot.top,
                                    left: dot.left,
                                    backgroundColor: dot.color,
                                    width: dot.size,
                                    height: dot.size,
                                    borderRadius: dot.size / 2,
                                    opacity: 0.7,
                                }]}
                            />
                        ))}
                    </View>

                    {/* Photos animation */}
                    <MatchPhotosAnimation
                        myPhoto={myPhoto}
                        theirPhoto={theirPhoto}
                        theirName={theirFirstName}
                    />

                    {/* Headline */}
                    <View style={styles.textBlock}>
                        <Text style={[styles.headline, { color: colors.foreground }]}>
                            It's a match
                        </Text>
                        <Text style={[styles.subline, { color: colors.mutedForeground }]}>
                            Looks like you're both open to meeting
                        </Text>
                    </View>

                    {/* Call nudge */}
                    <View style={[styles.callHintBox, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderColor: colors.border,
                    }]}>
                        <Text style={[styles.callHintText, { color: colors.mutedForeground }]}>
                            Before you meet, we recommend a quick{' '}
                            <Text style={[styles.callHintBold, { color: colors.foreground }]}>
                                3-minute call
                            </Text>
                            {' '}to confirm the vibe.
                        </Text>
                    </View>

                    {/* CTAs */}
                    <View style={styles.ctaBlock}>
                        <Animated.View style={btnAnimStyle}>
                            <Pressable
                                onPress={handleStartCall}
                                disabled={isStartingCall}
                                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.primaryBtnText}>Start 3-Minute Call</Text>
                            </Pressable>
                        </Animated.View>

                        <Pressable onPress={handleSkip} style={styles.skipBtn}>
                            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                                Do it later
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

// Decorative confetti dots — positions relative to the card
const CONFETTI_DOTS = [
    { top: 12, left: 18, size: 8, color: '#e91e8c' },
    { top: 20, left: '75%' as any, size: 6, color: '#f59e0b' },
    { top: 8, left: '40%' as any, size: 5, color: '#10b981' },
    { top: 30, left: '88%' as any, size: 7, color: '#e91e8c' },
    { top: 16, left: '55%' as any, size: 5, color: '#3b82f6' },
    { top: 6, left: 48, size: 6, color: '#d946a6' },
    { top: 28, left: 6, size: 5, color: '#f59e0b' },
];

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.72)',
    },
    root: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    card: {
        width: '100%',
        borderRadius: 28,
        borderWidth: 1,
        padding: 28,
        gap: 20,
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    confettiWrap: {
        ...StyleSheet.absoluteFillObject,
        pointerEvents: 'none',
    },
    confettiDot: {
        position: 'absolute',
    },
    textBlock: {
        alignItems: 'center',
        gap: 8,
    },
    headline: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.3,
        lineHeight: 32,
        paddingBottom: 2,
    },
    subline: {
        fontSize: 16,
        textAlign: 'center',
    },
    callHintBox: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
    },
    callHintText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
    },
    callHintBold: {
        fontWeight: '700',
    },
    ctaBlock: {
        width: '100%',
        gap: 10,
        alignItems: 'center',
    },
    primaryBtn: {
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 40,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 220,
        minHeight: 52,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    skipBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
