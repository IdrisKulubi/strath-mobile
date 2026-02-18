import React, { useCallback } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Alert,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    FadeIn,
    Layout,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useAgent, WingmanContext } from '@/hooks/use-agent';
import {
    ClockCounterClockwise,
    MagnifyingGlass,
    Trash,
    ArrowCounterClockwise,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

// ============================================
// SearchHistory — Wingman memory timeline
// ============================================
// Shows the user's past searches with outcomes, and lets them
// re-run a query or wipe their wingman memory.

interface SearchHistoryProps {
    onRepeatQuery?: (query: string) => void;
    onClose?: () => void;
}

function formatRelativeTime(timestamp: string): string {
    const now = Date.now();
    const then = new Date(timestamp).getTime();
    const diff = now - then;

    const minutes = Math.floor(diff / 60_000);
    const hours = Math.floor(diff / 3_600_000);
    const days = Math.floor(diff / 86_400_000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return 'yesterday';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
}

function FeedbackBreakdown({ breakdown }: {
    breakdown: WingmanContext['feedbackBreakdown'];
}) {
    const { colors } = useTheme();
    const total = breakdown.amazing + breakdown.nice + breakdown.meh + breakdown.not_for_me;
    if (total === 0) return null;

    const items = [
        { label: '🔥 Amazing', value: breakdown.amazing, color: '#ec4899' },
        { label: '✨ Nice', value: breakdown.nice, color: '#8b5cf6' },
        { label: '😐 Meh', value: breakdown.meh, color: '#f59e0b' },
        { label: '👋 Not for me', value: breakdown.not_for_me, color: '#6b7280' },
    ].filter(i => i.value > 0);

    return (
        <View style={styles.breakdownRow}>
            {items.map(item => (
                <View key={item.label} style={styles.breakdownItem}>
                    <View style={[styles.breakdownDot, { backgroundColor: item.color }]} />
                    <Text style={[styles.breakdownLabel, { color: colors.mutedForeground }]}>
                        {item.label}
                    </Text>
                    <Text style={[styles.breakdownCount, { color: colors.foreground }]}>
                        {item.value}
                    </Text>
                </View>
            ))}
        </View>
    );
}

export function SearchHistory({ onRepeatQuery, onClose }: SearchHistoryProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const { wingmanContext, isWingmanContextLoading, resetMemory, isResettingMemory, search } = useAgent();

    const handleRepeatQuery = useCallback((query: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onRepeatQuery) {
            onRepeatQuery(query);
        } else {
            search(query);
        }
        onClose?.();
    }, [onRepeatQuery, search, onClose]);

    const handleResetMemory = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        Alert.alert(
            'Reset Wingman Memory?',
            'This will erase all your search history and learned preferences. Your wingman will start fresh.\n\nThis cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    style: 'destructive',
                    onPress: () => {
                        resetMemory();
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    },
                },
            ],
        );
    }, [resetMemory]);

    if (isWingmanContextLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
                    Loading memory...
                </Text>
            </View>
        );
    }

    if (!wingmanContext || !wingmanContext.hasMemory) {
        return (
            <View style={styles.emptyContainer}>
                <View style={[styles.emptyIcon, { backgroundColor: colors.primary + '20' }]}>
                    <ClockCounterClockwise size={32} color={colors.primary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No history yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    Start searching and your wingman will remember what you like 🧠
                </Text>
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
        >
            {/* Header stats */}
            <Animated.View
                entering={FadeIn.duration(300)}
                style={[styles.statsCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                }]}
            >
                <LinearGradient
                    colors={isDark ? ['rgba(236,72,153,0.15)', 'rgba(139,92,246,0.12)'] : ['rgba(236,72,153,0.08)', 'rgba(139,92,246,0.06)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <Text style={[styles.statsTitle, { color: colors.foreground }]}>
                    🧠 Wingman Memory
                </Text>
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                            {wingmanContext.totalQueries}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                            searches
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                            {wingmanContext.totalFeedback}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                            feedback
                        </Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statValue, { color: colors.primary }]}>
                            {wingmanContext.learnedTraits}
                        </Text>
                        <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                            learned traits
                        </Text>
                    </View>
                </View>

                {/* Feedback breakdown */}
                {wingmanContext.totalFeedback > 0 && (
                    <FeedbackBreakdown breakdown={wingmanContext.feedbackBreakdown} />
                )}
            </Animated.View>

            {/* Proactive message */}
            {wingmanContext.proactiveMessage && (
                <Animated.View
                    entering={FadeIn.duration(400).delay(100)}
                    style={[styles.proactiveCard, {
                        backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.06)',
                        borderColor: isDark ? 'rgba(139,92,246,0.3)' : 'rgba(139,92,246,0.2)',
                    }]}
                >
                    <Text style={[styles.proactiveEmoji]}>💬</Text>
                    <Text style={[styles.proactiveText, { color: colors.foreground }]}>
                        {wingmanContext.proactiveMessage}
                    </Text>
                </Animated.View>
            )}

            {/* Search History timeline */}
            {wingmanContext.recentQueries.length > 0 && (
                <Animated.View entering={FadeIn.duration(400).delay(150)}>
                    <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>
                        Recent Searches
                    </Text>

                    <View style={styles.timeline}>
                        {wingmanContext.recentQueries.map((item, index) => (
                            <Animated.View
                                key={`${item.timestamp}-${index}`}
                                entering={FadeIn.duration(300).delay(index * 60)}
                                layout={Layout.springify()}
                                style={styles.timelineItemWrapper}
                            >
                                {/* Timeline dot + line */}
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                                    {index < wingmanContext.recentQueries.length - 1 && (
                                        <View style={[styles.timelineLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                                    )}
                                </View>

                                {/* Query card */}
                                <Pressable
                                    onPress={() => handleRepeatQuery(item.query)}
                                    style={({ pressed }) => [
                                        styles.timelineCard,
                                        {
                                            backgroundColor: pressed
                                                ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.04)')
                                                : (isDark ? 'rgba(255,255,255,0.06)' : '#fff'),
                                            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                        },
                                    ]}
                                >
                                    <View style={styles.timelineCardRow}>
                                        <MagnifyingGlass size={14} color={colors.primary} weight="bold" />
                                        <Text style={[styles.timelineQuery, { color: colors.foreground }]} numberOfLines={2}>
                                            {item.query}
                                        </Text>
                                    </View>
                                    <View style={styles.timelineMetaRow}>
                                        <Text style={[styles.timelineTime, { color: colors.mutedForeground }]}>
                                            {formatRelativeTime(item.timestamp)}
                                        </Text>
                                        {item.resultCount > 0 && (
                                            <View style={[styles.resultBadge, { backgroundColor: colors.primary + '20' }]}>
                                                <Text style={[styles.resultBadgeText, { color: colors.primary }]}>
                                                    {item.resultCount} {item.resultCount === 1 ? 'result' : 'results'}
                                                </Text>
                                            </View>
                                        )}
                                        <View style={[styles.repeatBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                                            <ArrowCounterClockwise size={12} color={colors.mutedForeground} />
                                            <Text style={[styles.repeatText, { color: colors.mutedForeground }]}>
                                                Repeat
                                            </Text>
                                        </View>
                                    </View>
                                </Pressable>
                            </Animated.View>
                        ))}
                    </View>
                </Animated.View>
            )}

            {/* Reset memory button */}
            <Animated.View entering={FadeIn.duration(400).delay(300)}>
                <Pressable
                    onPress={handleResetMemory}
                    disabled={isResettingMemory}
                    style={({ pressed }) => [
                        styles.resetButton,
                        {
                            backgroundColor: pressed
                                ? 'rgba(239,68,68,0.15)'
                                : 'rgba(239,68,68,0.08)',
                            borderColor: 'rgba(239,68,68,0.25)',
                            opacity: isResettingMemory ? 0.6 : 1,
                        },
                    ]}
                >
                    {isResettingMemory ? (
                        <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                        <Trash size={16} color="#ef4444" weight="bold" />
                    )}
                    <Text style={styles.resetButtonText}>
                        {isResettingMemory ? 'Resetting...' : 'Reset Wingman Memory'}
                    </Text>
                </Pressable>
                <Text style={[styles.resetCaption, { color: colors.mutedForeground }]}>
                    This clears all history and learned preferences
                </Text>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        padding: 16,
        gap: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
    },
    loadingText: {
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        padding: 40,
    },
    emptyIcon: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    statsCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        overflow: 'hidden',
        gap: 12,
    },
    statsTitle: {
        fontSize: 15,
        fontWeight: '700',
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
        gap: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
    },
    statLabel: {
        fontSize: 11,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statDivider: {
        width: 1,
        height: 32,
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    breakdownRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 4,
    },
    breakdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    breakdownDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    breakdownLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    breakdownCount: {
        fontSize: 12,
        fontWeight: '700',
    },
    proactiveCard: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    proactiveEmoji: {
        fontSize: 18,
        lineHeight: 22,
    },
    proactiveText: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        marginBottom: 12,
        paddingLeft: 4,
    },
    timeline: {
        gap: 0,
    },
    timelineItemWrapper: {
        flexDirection: 'row',
        gap: 12,
    },
    timelineLeft: {
        width: 16,
        alignItems: 'center',
        paddingTop: 16,
    },
    timelineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 2,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        minHeight: 16,
        marginTop: 4,
        borderRadius: 1,
    },
    timelineCard: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        marginBottom: 10,
        gap: 8,
    },
    timelineCardRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    timelineQuery: {
        flex: 1,
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    timelineMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
    },
    timelineTime: {
        fontSize: 11,
        fontWeight: '500',
        flex: 1,
    },
    resultBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    resultBadgeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    repeatBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    repeatText: {
        fontSize: 11,
        fontWeight: '600',
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 20,
        marginTop: 8,
    },
    resetButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#ef4444',
    },
    resetCaption: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 8,
    },
});
