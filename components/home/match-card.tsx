import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    FadeInDown,
    SlideOutRight,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { DailyMatch } from '@/hooks/use-daily-matches';
import { MatchReasons } from './match-reasons';
import { getMatchTier } from '@/lib/match-tier';

interface MatchCardProps {
    match: DailyMatch;
    index: number;
    onOpenToMeet: (match: DailyMatch) => void;
    onMaybe: (match: DailyMatch) => void;
    onPass: (match: DailyMatch) => void;
    onViewProfile?: (match: DailyMatch) => void;
    actionsDisabled?: boolean;
}

function buildIdentityLine(match: DailyMatch) {
    const parts = [match.course, match.university].filter(Boolean);
    if (parts.length === 0) return 'Curated for you today';
    if (parts.length === 1) return parts[0] as string;
    return `${parts[0]} • ${parts[1]}`;
}

function buildExpiryText(expiresAt: string) {
    const remainingMs = new Date(expiresAt).getTime() - Date.now();
    const remainingHours = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60)));
    if (remainingHours <= 1) return 'This intro closes in under an hour';
    if (remainingHours < 24) return `This intro closes in about ${remainingHours} hours`;
    const days = Math.ceil(remainingHours / 24);
    return `This intro closes in about ${days} day${days === 1 ? '' : 's'}`;
}

export function MatchCard({
    match,
    index,
    onOpenToMeet,
    onMaybe,
    onPass,
    onViewProfile,
    actionsDisabled = false,
}: MatchCardProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const identityLine = buildIdentityLine(match);
    const expiryText = buildExpiryText(match.expiresAt);
    const tier = getMatchTier(match.compatibilityScore);

    const askScale = useSharedValue(1);
    const maybeScale = useSharedValue(1);
    const skipScale = useSharedValue(1);
    const viewScale = useSharedValue(1);

    const askAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: askScale.value }] }));
    const maybeAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: maybeScale.value }] }));
    const skipAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipScale.value }] }));
    const viewAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: viewScale.value }] }));

    const handleViewProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        viewScale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.cubic) }, () => {
            viewScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
        });
        if (onViewProfile) {
            onViewProfile(match);
        } else {
            router.push({
                pathname: '/profile/[userId]',
                params: { userId: match.userId, pairId: match.pairId },
            });
        }
    }, [match, onViewProfile, router, viewScale]);

    const handleOpenToMeet = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        askScale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.cubic) }, () => {
            askScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
        });
        onOpenToMeet(match);
    }, [match, onOpenToMeet, askScale]);

    const handlePass = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        skipScale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.cubic) }, () => {
            skipScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
        });
        onPass(match);
    }, [match, onPass, skipScale]);

    const handleMaybe = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        maybeScale.value = withTiming(0.96, { duration: 100, easing: Easing.out(Easing.cubic) }, () => {
            maybeScale.value = withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) });
        });
        onMaybe(match);
    }, [match, maybeScale, onMaybe]);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).duration(280)}
            exiting={SlideOutRight.duration(280)}
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    shadowColor: isDark ? colors.background : colors.foreground,
                },
            ]}
        >
            <Pressable onPress={handleViewProfile} style={styles.photoWrap}>
                {match.profilePhoto ? (
                    <CachedImage
                        uri={match.profilePhoto}
                        style={styles.photo}
                        contentFit="cover"
                        priority="high"
                        allowDownscaling={false}
                    />
                ) : (
                    <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.muted }]}>
                        <Ionicons name="person-circle-outline" size={72} color={colors.mutedForeground} />
                    </View>
                )}
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.14)', 'rgba(0,0,0,0.7)']}
                    locations={[0, 0.45, 1]}
                    style={styles.photoGradient}
                    pointerEvents="none"
                />
                <View style={styles.photoMetaRow}>
                    <View style={styles.photoNameWrap}>
                        <View style={[styles.tierPill, { backgroundColor: colors.primary }]}>
                            <Ionicons name="sparkles" size={11} color={colors.primaryForeground} />
                            <Text style={[styles.tierPillText, { color: colors.primaryForeground }]}>{tier.label}</Text>
                        </View>
                        <Text style={[styles.photoName, { color: colors.primaryForeground }]}>
                            {match.firstName}, {match.age}
                        </Text>
                        <Text style={[styles.photoCourse, { color: colors.primaryForeground }]}>
                            {identityLine}
                        </Text>
                    </View>
                </View>
            </Pressable>

            <View style={styles.body}>
                <MatchReasons reasons={match.reasons} />
                <Text style={[styles.refreshText, { color: colors.mutedForeground }]}>
                    {expiryText}
                </Text>
                <View style={styles.ctaRow}>
                    <Animated.View style={[styles.ctaViewWrap, viewAnimStyle]}>
                        <Pressable
                            onPress={handleViewProfile}
                            style={[
                                styles.ctaView,
                                {
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(15,23,42,0.03)',
                                },
                            ]}
                        >
                            <Text style={[styles.ctaViewText, { color: colors.foreground }]}>
                                View Profile
                            </Text>
                        </Pressable>
                    </Animated.View>

                    <Animated.View style={[styles.ctaAskWrap, askAnimStyle]}>
                        <Pressable
                            onPress={
                                match.currentUserDecision === 'pending' && !actionsDisabled
                                    ? handleOpenToMeet
                                    : undefined
                            }
                            disabled={match.currentUserDecision !== 'pending' || actionsDisabled}
                            style={[
                                styles.ctaAsk,
                                match.currentUserDecision === 'open_to_meet' && [styles.ctaAskSent, { backgroundColor: colors.success }],
                                actionsDisabled && match.currentUserDecision === 'pending' && styles.ctaDisabled,
                            ]}
                        >
                            {match.currentUserDecision === 'open_to_meet' ? (
                                <View style={[styles.ctaAskInner, styles.ctaAskSentInner]}>
                                    <Ionicons name="checkmark-circle" size={20} color={colors.primaryForeground} />
                                    <Text style={[styles.ctaAskText, { color: colors.primaryForeground }]}>Decision Saved</Text>
                                </View>
                            ) : (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary }]}>
                                    <View style={styles.ctaAskInner}>
                                        <Text style={[styles.ctaAskText, { color: colors.primaryForeground }]}>Interested</Text>
                                    </View>
                                </View>
                            )}
                        </Pressable>
                    </Animated.View>
                </View>

                {match.currentUserDecision === 'pending' && (
                    <View style={styles.secondaryActions}>
                    <Animated.View style={[styles.secondaryActionWrap, maybeAnimStyle]}>
                        <Pressable
                            onPress={!actionsDisabled ? handleMaybe : undefined}
                            disabled={actionsDisabled}
                            style={[styles.secondaryBtn, actionsDisabled && styles.skipBtnDisabled]}
                        >
                            <Ionicons name="time-outline" size={15} color={colors.mutedForeground} />
                            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                                Maybe
                            </Text>
                        </Pressable>
                    </Animated.View>
                    <Animated.View style={[styles.secondaryActionWrap, skipAnimStyle]}>
                        <Pressable
                            onPress={!actionsDisabled ? handlePass : undefined}
                            disabled={actionsDisabled}
                            style={[styles.secondaryBtn, actionsDisabled && styles.skipBtnDisabled]}
                        >
                            <Ionicons name="close-outline" size={16} color={colors.mutedForeground} />
                            <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                                Pass
                            </Text>
                        </Pressable>
                    </Animated.View>
                    </View>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 28,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 20,
        shadowOpacity: 0.12,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 10 },
        elevation: 6,
    },
    photoWrap: {
        height: 480,
        position: 'relative',
    },
    photoGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 220,
    },
    photo: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
    },
    photoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoMetaRow: {
        position: 'absolute',
        left: 16,
        right: 16,
        bottom: 16,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 12,
    },
    photoNameWrap: {
        flex: 1,
        gap: 4,
    },
    photoName: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.7,
        lineHeight: 32,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    photoCourse: {
        fontSize: 13,
        opacity: 0.9,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    tierPill: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        borderRadius: 999,
        backgroundColor: 'transparent',
        paddingHorizontal: 9,
        paddingVertical: 3,
        marginBottom: 6,
    },
    tierPillText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    body: {
        paddingHorizontal: 16,
        paddingTop: 14,
        paddingBottom: 14,
        gap: 12,
    },
    refreshText: {
        fontSize: 11,
        fontWeight: '500',
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 2,
    },
    ctaViewWrap: {
        flex: 1,
    },
    ctaView: {
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    ctaViewText: {
        fontSize: 14,
        fontWeight: '700',
    },
    ctaAskWrap: {
        flex: 1,
    },
    ctaAsk: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 50,
        position: 'relative',
    },
    ctaAskSent: {},
    ctaDisabled: {
        opacity: 0.55,
    },
    ctaAskInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    ctaAskSentInner: {
        flexDirection: 'row',
        gap: 8,
    },
    ctaAskText: {
        fontSize: 14,
        fontWeight: '700',
    },
    secondaryActions: {
        flexDirection: 'row',
        gap: 10,
    },
    secondaryActionWrap: {
        flex: 1,
    },
    secondaryBtn: {
        minHeight: 40,
        borderRadius: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 5,
        paddingVertical: 8,
        paddingHorizontal: 16,
    },
    skipBtnDisabled: {
        opacity: 0.45,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
