import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
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
import { CompatibilityBar } from './compatibility-bar';
import { MatchReasons } from './match-reasons';

interface MatchCardProps {
    match: DailyMatch;
    index: number;
    onAskForDate: (match: DailyMatch) => void;
    onSkip: (userId: string) => void;
}

export function MatchCard({ match, index, onAskForDate, onSkip }: MatchCardProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();

    const askScale = useSharedValue(1);
    const skipScale = useSharedValue(1);
    const viewScale = useSharedValue(1);

    const askAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: askScale.value }] }));
    const skipAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: skipScale.value }] }));
    const viewAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: viewScale.value }] }));

    const handleViewProfile = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        viewScale.value = withSpring(0.96, { damping: 10, stiffness: 300 }, () => {
            viewScale.value = withSpring(1);
        });
        router.push(`/profile/${match.userId}`);
    }, [match.userId, router, viewScale]);

    const handleAskForDate = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        askScale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            askScale.value = withSpring(1);
        });
        onAskForDate(match);
    }, [match, onAskForDate, askScale]);

    const handleSkip = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        skipScale.value = withTiming(0.94, { duration: 80 }, () => {
            skipScale.value = withSpring(1);
        });
        onSkip(match.userId);
    }, [match.userId, onSkip, skipScale]);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify().damping(14)}
            exiting={SlideOutRight.duration(280)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            {/* Photo */}
            <Pressable onPress={handleViewProfile} style={styles.photoWrap}>
                {match.profilePhoto ? (
                    <CachedImage
                        uri={match.profilePhoto}
                        style={styles.photo}
                        contentFit="cover"
                    />
                ) : (
                    <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.muted }]}>
                        <Ionicons name="person-circle-outline" size={72} color={colors.mutedForeground} />
                    </View>
                )}
                {/* Gradient overlay at bottom of photo */}
                <View style={styles.photoOverlay} />
                {/* Name + age on photo */}
                <View style={styles.photoNameWrap}>
                    <Text style={styles.photoName}>
                        {match.firstName}, {match.age}
                    </Text>
                    {match.course && (
                        <Text style={styles.photoCourse}>{match.course}</Text>
                    )}
                </View>
            </Pressable>

            {/* Body */}
            <View style={styles.body}>
                {/* Compatibility bar */}
                <CompatibilityBar score={match.compatibilityScore} animationDelay={index * 80 + 200} />

                {/* Why you match */}
                <MatchReasons reasons={match.reasons} />

                {/* CTAs */}
                <View style={styles.ctaRow}>
                    <Animated.View style={[styles.ctaViewWrap, viewAnimStyle]}>
                        <Pressable
                            onPress={handleViewProfile}
                            style={[
                                styles.ctaView,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                },
                            ]}
                        >
                            <Text style={[styles.ctaViewText, { color: colors.foreground }]}>
                                View Profile
                            </Text>
                        </Pressable>
                    </Animated.View>

                    {match.requestSent ? (
                        <View style={[styles.ctaAsk, styles.ctaAskSent]}>
                            <Ionicons name="checkmark-circle" size={16} color="#fff" />
                            <Text style={styles.ctaAskText}>Request Sent</Text>
                        </View>
                    ) : (
                        <Animated.View style={[styles.ctaAskWrap, askAnimStyle]}>
                            <Pressable onPress={handleAskForDate} style={styles.ctaAsk}>
                                <Text style={styles.ctaAskText}>Send Date Invite</Text>
                            </Pressable>
                        </Animated.View>
                    )}
                </View>

                {/* Skip */}
                <Animated.View style={[styles.skipWrap, skipAnimStyle]}>
                    <Pressable onPress={handleSkip} style={styles.skipBtn}>
                        <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                            Skip
                        </Text>
                    </Pressable>
                </Animated.View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
        marginHorizontal: 16,
        marginBottom: 16,
    },
    photoWrap: {
        height: 220,
        position: 'relative',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    photoOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
        backgroundColor: 'rgba(0,0,0,0.35)',
    },
    photoNameWrap: {
        position: 'absolute',
        bottom: 12,
        left: 14,
        gap: 2,
    },
    photoName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    photoCourse: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 13,
        fontWeight: '500',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    body: {
        padding: 16,
        gap: 12,
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 2,
    },
    ctaViewWrap: {
        flex: 1,
    },
    ctaView: {
        borderRadius: 14,
        borderWidth: 1,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 46,
    },
    ctaViewText: {
        fontSize: 14,
        fontWeight: '600',
    },
    ctaAskWrap: {
        flex: 1,
    },
    ctaAsk: {
        flex: 1,
        backgroundColor: '#e91e8c',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 6,
        minHeight: 46,
    },
    ctaAskSent: {
        backgroundColor: '#10b981',
        flex: 1,
    },
    ctaAskText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    skipWrap: {
        alignItems: 'center',
    },
    skipBtn: {
        paddingVertical: 6,
        paddingHorizontal: 16,
    },
    skipText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
