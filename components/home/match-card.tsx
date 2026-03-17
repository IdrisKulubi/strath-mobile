import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
    onOpenToMeet: (match: DailyMatch) => void;
    onPass: (match: DailyMatch) => void;
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
    if (remainingHours <= 1) return 'Refreshes in under 1 hour';
    return `Refreshes in about ${remainingHours} hours`;
}

export function MatchCard({ match, index, onOpenToMeet, onPass }: MatchCardProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const identityLine = buildIdentityLine(match);
    const expiryText = buildExpiryText(match.expiresAt);

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
        router.push({
            pathname: '/profile/[userId]',
            params: { userId: match.userId, pairId: match.pairId },
        });
    }, [match.pairId, match.userId, router, viewScale]);

    const handleOpenToMeet = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        askScale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            askScale.value = withSpring(1);
        });
        onOpenToMeet(match);
    }, [match, onOpenToMeet, askScale]);

    const handlePass = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        skipScale.value = withTiming(0.94, { duration: 80 }, () => {
            skipScale.value = withSpring(1);
        });
        onPass(match);
    }, [match, onPass, skipScale]);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify().damping(14)}
            exiting={SlideOutRight.duration(280)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    shadowColor: isDark ? '#000' : '#160b28',
                },
            ]}
        >
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
                <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.75)']}
                    style={styles.photoGradient}
                    pointerEvents="none"
                />
                <View style={styles.photoMetaRow}>
                    <View style={styles.photoNameWrap}>
                        <Text style={styles.photoName}>
                            {match.firstName}, {match.age}
                        </Text>
                        <Text style={styles.photoCourse}>{identityLine}</Text>
                    </View>
                    <View style={styles.scoreBadge}>
                        <Text style={styles.scoreBadgeValue}>{match.compatibilityScore}%</Text>
                        <Text style={styles.scoreBadgeLabel}>Vibe Match</Text>
                    </View>
                </View>
            </Pressable>

            <View style={styles.body}>
                <CompatibilityBar score={match.compatibilityScore} animationDelay={index * 80 + 200} />
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
                        <Pressable onPress={handleOpenToMeet} style={styles.ctaAsk}>
                            <LinearGradient
                                colors={['#ec4899', '#e91e8c']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            >
                                <View style={styles.ctaAskInner}>
                                    <Text style={styles.ctaAskText}>Open to Meet</Text>
                                </View>
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </View>

                <Animated.View style={[styles.skipWrap, skipAnimStyle]}>
                    <Pressable onPress={handlePass} style={styles.skipBtn}>
                        <Text style={[styles.skipText, { color: colors.mutedForeground }]}>
                            Pass
                        </Text>
                    </Pressable>
                </Animated.View>
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
        height: 320,
        position: 'relative',
    },
    photoGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 120,
    },
    photo: {
        width: '100%',
        height: '100%',
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
        color: '#fff',
        fontSize: 31,
        fontWeight: '800',
        letterSpacing: -0.8,
        lineHeight: 34,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
    },
    photoCourse: {
        color: 'rgba(255,255,255,0.9)',
        fontSize: 14,
        fontWeight: '600',
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    scoreBadge: {
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.16)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        minWidth: 86,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreBadgeValue: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
        lineHeight: 20,
    },
    scoreBadgeLabel: {
        color: 'rgba(255,255,255,0.88)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'lowercase',
    },
    body: {
        paddingHorizontal: 18,
        paddingTop: 18,
        paddingBottom: 16,
        gap: 16,
    },
    refreshText: {
        fontSize: 12,
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
        borderRadius: 18,
        borderWidth: 1,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    ctaViewText: {
        fontSize: 15,
        fontWeight: '700',
    },
    ctaAskWrap: {
        flex: 1,
    },
    ctaAsk: {
        flex: 1,
        borderRadius: 18,
        overflow: 'hidden',
        minHeight: 56,
        position: 'relative',
    },
    ctaAskInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    ctaAskText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    skipWrap: {
        alignItems: 'center',
    },
    skipBtn: {
        paddingVertical: 4,
        paddingHorizontal: 16,
    },
    skipText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
