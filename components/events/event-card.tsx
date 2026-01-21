import React from 'react';
import { View, StyleSheet, Pressable, Image } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin, Users, CalendarBlank, Clock } from 'phosphor-react-native';
import { CampusEvent, getCategoryInfo, formatEventTime, getTimeUntil } from '@/types/events';
import * as Haptics from 'expo-haptics';

interface EventCardProps {
    event: CampusEvent;
    onPress: () => void;
    onRsvp?: (status: "going" | "interested") => void;
    variant?: 'default' | 'compact';
    index?: number;
}

export function EventCard({ 
    event, 
    onPress, 
    onRsvp,
    variant = 'default',
    index = 0,
}: EventCardProps) {
    const { colors, isDark } = useTheme();
    const categoryInfo = getCategoryInfo(event.category);
    
    const handleRsvp = (status: "going" | "interested") => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRsvp?.(status);
    };

    if (variant === 'compact') {
        return (
            <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
                <Pressable
                    onPress={onPress}
                    style={({ pressed }) => [
                        styles.compactCard,
                        {
                            backgroundColor: isDark ? colors.card : '#fff',
                            borderColor: colors.border,
                            transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                    ]}
                >
                    {/* Cover Image or Category Color */}
                    <View style={[styles.compactImage, { backgroundColor: categoryInfo.color + '20' }]}>
                        {event.coverImage ? (
                            <Image source={{ uri: event.coverImage }} style={styles.compactImageContent} />
                        ) : (
                            <Text style={styles.compactEmoji}>{categoryInfo.icon}</Text>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.compactContent}>
                        <Text 
                            style={[styles.compactTitle, { color: colors.foreground }]}
                            numberOfLines={1}
                        >
                            {event.title}
                        </Text>
                        
                        <View style={styles.compactMeta}>
                            <Clock size={12} color={colors.mutedForeground} />
                            <Text style={[styles.compactMetaText, { color: colors.mutedForeground }]}>
                                {getTimeUntil(event.startTime)}
                            </Text>
                        </View>

                        <View style={styles.compactStats}>
                            <Users size={12} color={colors.primary} weight="fill" />
                            <Text style={[styles.compactStatsText, { color: colors.primary }]}>
                                {event.goingCount} going
                            </Text>
                        </View>
                    </View>
                </Pressable>
            </Animated.View>
        );
    }

    return (
        <Animated.View entering={FadeInRight.delay(index * 100).springify()}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.card,
                    {
                        backgroundColor: isDark ? colors.card : '#fff',
                        borderColor: colors.border,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                ]}
            >
                {/* Cover Image */}
                <View style={styles.imageContainer}>
                    {event.coverImage ? (
                        <Image source={{ uri: event.coverImage }} style={styles.image} />
                    ) : (
                        <LinearGradient
                            colors={[categoryInfo.color, categoryInfo.color + '80']}
                            style={styles.placeholderImage}
                        >
                            <Text style={styles.placeholderEmoji}>{categoryInfo.icon}</Text>
                        </LinearGradient>
                    )}
                    
                    {/* Time Badge */}
                    <View style={[styles.timeBadge, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
                        <Text style={styles.timeBadgeText}>{getTimeUntil(event.startTime)}</Text>
                    </View>

                    {/* Category Badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: categoryInfo.color }]}>
                        <Text style={styles.categoryBadgeText}>{categoryInfo.label}</Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.content}>
                    <Text 
                        style={[styles.title, { color: colors.foreground }]}
                        numberOfLines={2}
                    >
                        {event.title}
                    </Text>

                    {/* Meta Info */}
                    <View style={styles.metaRow}>
                        <CalendarBlank size={14} color={colors.mutedForeground} />
                        <Text style={[styles.metaText, { color: colors.mutedForeground }]}>
                            {formatEventTime(event.startTime)}
                        </Text>
                    </View>

                    {event.location && (
                        <View style={styles.metaRow}>
                            <MapPin size={14} color={colors.mutedForeground} />
                            <Text 
                                style={[styles.metaText, { color: colors.mutedForeground }]}
                                numberOfLines={1}
                            >
                                {event.location}
                            </Text>
                        </View>
                    )}

                    {/* Stats & RSVP */}
                    <View style={styles.footer}>
                        <View style={styles.stats}>
                            <Users size={16} color={colors.primary} weight="fill" />
                            <Text style={[styles.statsText, { color: colors.foreground }]}>
                                <Text style={{ fontWeight: '700' }}>{event.goingCount}</Text> going
                                {event.interestedCount > 0 && (
                                    <Text style={{ color: colors.mutedForeground }}>
                                        {' '}· {event.interestedCount} interested
                                    </Text>
                                )}
                            </Text>
                        </View>

                        {/* RSVP Button */}
                        {event.userRsvpStatus ? (
                            <View style={[
                                styles.rsvpBadge, 
                                { 
                                    backgroundColor: event.userRsvpStatus === 'going' 
                                        ? colors.primary + '20' 
                                        : colors.muted 
                                }
                            ]}>
                                <Text style={[
                                    styles.rsvpBadgeText,
                                    { color: event.userRsvpStatus === 'going' ? colors.primary : colors.foreground }
                                ]}>
                                    {event.userRsvpStatus === 'going' ? '✓ Going' : '★ Interested'}
                                </Text>
                            </View>
                        ) : (
                            <Pressable
                                onPress={() => handleRsvp('interested')}
                                style={[styles.interestedButton, { backgroundColor: colors.primary }]}
                            >
                                <Text style={styles.interestedButtonText}>Interested</Text>
                            </Pressable>
                        )}
                    </View>
                </View>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    // Default Card
    card: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        marginBottom: 16,
    },
    imageContainer: {
        width: '100%',
        height: 140,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    placeholderImage: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderEmoji: {
        fontSize: 48,
    },
    timeBadge: {
        position: 'absolute',
        top: 12,
        left: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    timeBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    categoryBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    categoryBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    content: {
        padding: 16,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 4,
    },
    metaText: {
        fontSize: 13,
        flex: 1,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statsText: {
        fontSize: 13,
    },
    rsvpBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    rsvpBadgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    interestedButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    interestedButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },

    // Compact Card
    compactCard: {
        flexDirection: 'row',
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        width: 220,
        marginRight: 12,
    },
    compactImage: {
        width: 70,
        height: 90,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactImageContent: {
        width: '100%',
        height: '100%',
    },
    compactEmoji: {
        fontSize: 28,
    },
    compactContent: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
    },
    compactTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    compactMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    compactMetaText: {
        fontSize: 11,
    },
    compactStats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    compactStatsText: {
        fontSize: 11,
        fontWeight: '600',
    },
});
