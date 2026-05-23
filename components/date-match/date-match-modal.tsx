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
import { useTheme } from '@/hooks/use-theme';
import { MatchPhotosAnimation } from './match-photos-animation';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface DateMatchModalProps {
    visible: boolean;
    legacyMatchId?: string;
    theirFirstName: string;
    theirPhoto?: string | null;
    myPhoto?: string | null;
    onClose: () => void;
}

export function DateMatchModal({
    visible,
    legacyMatchId,
    theirFirstName,
    theirPhoto,
    myPhoto,
    onClose,
}: DateMatchModalProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

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

    const handleMessage = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        btnScale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            btnScale.value = withSpring(1);
        });

        onClose();
        if (legacyMatchId) {
            router.push({ pathname: '/chat/[matchId]', params: { matchId: legacyMatchId } } as any);
            return;
        }
        router.push('/(tabs)/dates');
    }, [btnScale, legacyMatchId, onClose, router]);

    const handleViewDates = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onClose();
        router.push('/(tabs)/dates');
    }, [onClose, router]);

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
            <Animated.View style={[styles.backdrop, backdropStyle]} />

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

                    <MatchPhotosAnimation
                        myPhoto={myPhoto}
                        theirPhoto={theirPhoto}
                        theirName={theirFirstName}
                    />

                    <View style={styles.textBlock}>
                        <Text style={[styles.headline, { color: colors.foreground }]}>
                            It's a match
                        </Text>
                        <Text style={[styles.subline, { color: colors.mutedForeground }]}>
                            Say hi in chat while we arrange your date
                        </Text>
                    </View>

                    <View style={[styles.hintBox, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                        borderColor: colors.border,
                    }]}>
                        <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
                            Message {theirFirstName} to break the ice. Our team will reach out when your date is ready.
                        </Text>
                    </View>

                    <View style={styles.ctaBlock}>
                        <Animated.View style={btnAnimStyle}>
                            <Pressable
                                onPress={handleMessage}
                                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.primaryBtnText}>
                                    {legacyMatchId ? `Message ${theirFirstName}` : 'View in Dates'}
                                </Text>
                            </Pressable>
                        </Animated.View>

                        <Pressable onPress={handleViewDates} style={styles.skipBtn}>
                            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                                View in Dates
                            </Text>
                        </Pressable>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

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
    hintBox: {
        borderRadius: 14,
        borderWidth: 1,
        paddingHorizontal: 16,
        paddingVertical: 12,
        width: '100%',
    },
    hintText: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
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
