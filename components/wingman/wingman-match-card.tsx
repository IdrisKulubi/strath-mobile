import React, { memo } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    Dimensions,
} from 'react-native';
import Animated, {
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import {
    GraduationCap,
    ChatCircle,
    Heart,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { AgentMatch } from '@/hooks/use-agent';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;

interface WingmanMatchCardProps {
    match: AgentMatch;
    index: number;
    onPress: (match: AgentMatch) => void;
    onLike?: (match: AgentMatch) => void;
}

function WingmanMatchCardInner({ match, index, onPress, onLike }: WingmanMatchCardProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const scale = useSharedValue(1);

    const { profile, explanation } = match;

    const displayName = profile.firstName || 'Someone special';
    const age = profile.age;
    const course = profile.course;
    const yearOfStudy = profile.yearOfStudy;
    const photo = profile.profilePhoto || (profile.photos && profile.photos[0]);
    const matchPct = Math.round(explanation.matchPercentage);

    const animatedScale = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 300 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(match);
    };

    const handleLike = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onLike?.(match);
    };

    // Match percentage color
    const getMatchColor = (pct: number) => {
        if (pct >= 80) return '#10b981'; // green
        if (pct >= 60) return '#f59e0b'; // amber
        if (pct >= 40) return '#f97316'; // orange
        return '#ef4444'; // red
    };

    const matchColor = getMatchColor(matchPct);

    return (
        <Animated.View entering={FadeInDown.delay(index * 80).springify()}>
            <Pressable
                onPressIn={handlePressIn}
                onPressOut={handlePressOut}
                onPress={handlePress}
            >
                <Animated.View
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        },
                        animatedScale,
                    ]}
                >
                    {/* Top section: Photo + Info */}
                    <View style={styles.topRow}>
                        {/* Profile photo */}
                        <View style={styles.photoContainer}>
                            {photo ? (
                                <CachedImage
                                    uri={photo}
                                    style={styles.photo}
                                />
                            ) : (
                                <View style={[styles.photo, styles.noPhoto, {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                }]}>
                                    <Text style={{ fontSize: 28 }}>
                                        {explanation.vibeEmoji || '✨'}
                                    </Text>
                                </View>
                            )}

                            {/* Match percentage badge */}
                            <View style={[styles.matchBadge, { backgroundColor: matchColor }]}>
                                <Text style={styles.matchBadgeText}>{matchPct}%</Text>
                            </View>
                        </View>

                        {/* Info */}
                        <View style={styles.infoContainer}>
                            <View style={styles.nameRow}>
                                <Text
                                    style={[styles.name, { color: colors.foreground }]}
                                    numberOfLines={1}
                                >
                                    {displayName}{age ? `, ${age}` : ''}
                                </Text>
                                <Text style={{ fontSize: 18 }}>{explanation.vibeEmoji}</Text>
                            </View>

                            {/* Tagline */}
                            <Text
                                style={[styles.tagline, { color: colors.primary }]}
                                numberOfLines={2}
                            >
                                {explanation.tagline}
                            </Text>

                            {/* Course & Year */}
                            {course && (
                                <View style={styles.detailRow}>
                                    <GraduationCap size={14} color={colors.mutedForeground} />
                                    <Text
                                        style={[styles.detailText, { color: colors.mutedForeground }]}
                                        numberOfLines={1}
                                    >
                                        {course}{yearOfStudy ? ` · Year ${yearOfStudy}` : ''}
                                    </Text>
                                </View>
                            )}

                            {/* Summary */}
                            <Text
                                style={[styles.summary, { color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }]}
                                numberOfLines={2}
                            >
                                {explanation.summary}
                            </Text>
                        </View>
                    </View>

                    {/* Conversation starters */}
                    {explanation.conversationStarters && explanation.conversationStarters.length > 0 && (
                        <View style={styles.startersSection}>
                            <View style={styles.startersHeader}>
                                <ChatCircle size={14} color={colors.primary} weight="fill" />
                                <Text style={[styles.startersLabel, { color: colors.primary }]}>
                                    Conversation starters
                                </Text>
                            </View>
                            <View style={styles.startersList}>
                                {explanation.conversationStarters.slice(0, 2).map((starter, i) => (
                                    <View
                                        key={i}
                                        style={[styles.starterChip, {
                                            backgroundColor: isDark
                                                ? 'rgba(233, 30, 140, 0.1)'
                                                : 'rgba(233, 30, 140, 0.06)',
                                            borderColor: isDark
                                                ? 'rgba(233, 30, 140, 0.2)'
                                                : 'rgba(233, 30, 140, 0.12)',
                                        }]}
                                    >
                                        <Text
                                            style={[styles.starterText, {
                                                color: isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)',
                                            }]}
                                            numberOfLines={1}
                                        >
                                            &ldquo;{starter}&rdquo;
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}

                    {/* Bottom action row */}
                    <View style={styles.actionRow}>
                        {/* Shared interests */}
                        {profile.interests && profile.interests.length > 0 && (
                            <View style={styles.interestsRow}>
                                {profile.interests.slice(0, 3).map((interest, i) => (
                                    <View
                                        key={i}
                                        style={[styles.interestTag, {
                                            backgroundColor: isDark
                                                ? 'rgba(255,255,255,0.06)'
                                                : 'rgba(0,0,0,0.04)',
                                        }]}
                                    >
                                        <Text style={[styles.interestText, {
                                            color: colors.mutedForeground,
                                        }]} numberOfLines={1}>
                                            {interest.replace(/^[\p{Emoji}\p{Emoji_Presentation}\s]+/u, '').trim() || interest}
                                        </Text>
                                    </View>
                                ))}
                                {profile.interests.length > 3 && (
                                    <Text style={[styles.moreInterests, { color: colors.mutedForeground }]}>
                                        +{profile.interests.length - 3}
                                    </Text>
                                )}
                            </View>
                        )}

                        {/* Like button */}
                        {onLike && (
                            <Pressable
                                onPress={handleLike}
                                style={[styles.likeButton]}
                            >
                                <LinearGradient
                                    colors={['#ec4899', '#f43f5e']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.likeGradient}
                                >
                                    <Heart size={16} color="#fff" weight="fill" />
                                </LinearGradient>
                            </Pressable>
                        )}
                    </View>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
}

export const WingmanMatchCard = memo(WingmanMatchCardInner);

const styles = StyleSheet.create({
    card: {
        width: CARD_WIDTH,
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginBottom: 12,
        gap: 12,
    },
    topRow: {
        flexDirection: 'row',
        gap: 14,
    },
    photoContainer: {
        position: 'relative',
    },
    photo: {
        width: 80,
        height: 100,
        borderRadius: 14,
    },
    noPhoto: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    matchBadge: {
        position: 'absolute',
        bottom: -6,
        right: -6,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        minWidth: 36,
        alignItems: 'center',
    },
    matchBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '800',
    },
    infoContainer: {
        flex: 1,
        gap: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        flexShrink: 1,
    },
    tagline: {
        fontSize: 13,
        fontWeight: '600',
        fontStyle: 'italic',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    detailText: {
        fontSize: 12,
        fontWeight: '500',
        flexShrink: 1,
    },
    summary: {
        fontSize: 12,
        fontWeight: '400',
        lineHeight: 17,
        marginTop: 2,
    },
    startersSection: {
        gap: 6,
    },
    startersHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    startersLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
    startersList: {
        gap: 6,
    },
    starterChip: {
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 12,
        borderWidth: 1,
    },
    starterText: {
        fontSize: 12,
        fontWeight: '500',
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    interestsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        flexWrap: 'nowrap',
    },
    interestTag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        maxWidth: 90,
    },
    interestText: {
        fontSize: 11,
        fontWeight: '500',
    },
    moreInterests: {
        fontSize: 11,
        fontWeight: '600',
    },
    likeButton: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    likeGradient: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
