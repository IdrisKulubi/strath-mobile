import React from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ActivityIndicator,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeOut,
    SlideInUp,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { WingmanMatchCard } from './wingman-match-card';
import { AgentMatch, AgentSearchResponse } from '@/hooks/use-agent';

import {
    Sparkle,
    Lightning,
    ArrowDown,
    Waveform,
} from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';



interface WingmanResultsProps {
    matches: AgentMatch[];
    commentary: string | null;
    intent: AgentSearchResponse['intent'] | null;
    meta: AgentSearchResponse['meta'] | null;
    isSearching: boolean;
    searchError: string | null;
    currentQuery: string | null;
    onLoadMore: () => void;
    onMatchPress: (match: AgentMatch) => void;
    onMatchLike?: (match: AgentMatch) => void;
    onRefine?: (query: string) => void;
}

// ===== Empty state when no search has been done =====
function WingmanEmptyState() {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const tips = [
        { emoji: '🎵', text: '"someone who loves afrobeats and late night convos"' },
        { emoji: '💻', text: '"a chill CS student who\'s into startups"' },
        { emoji: '📚', text: '"artsy people who read and do photography"' },
        { emoji: '🏋️', text: '"gym buddy who\'s also into anime"' },
    ];

    return (
        <Animated.View
            entering={FadeIn.duration(400)}
            style={styles.emptyContainer}
        >
            <View style={[styles.emptyIcon, {
                backgroundColor: isDark ? 'rgba(233, 30, 140, 0.12)' : 'rgba(233, 30, 140, 0.08)',
            }]}>
                <Sparkle size={40} color={colors.primary} weight="fill" />
            </View>

            <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                Your AI Wingman
            </Text>

            <Text style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                Describe your vibe and I&apos;ll find your people.{'\n'}
                Use text or voice — just be you.
            </Text>

            <View style={styles.tipsContainer}>
                <Text style={[styles.tipsLabel, { color: colors.mutedForeground }]}>
                    Try something like:
                </Text>
                {tips.map((tip, i) => (
                    <View
                        key={i}
                        style={[styles.tipRow, {
                            backgroundColor: isDark
                                ? 'rgba(255,255,255,0.04)'
                                : 'rgba(0,0,0,0.02)',
                        }]}
                    >
                        <Text style={{ fontSize: 18 }}>{tip.emoji}</Text>
                        <Text style={[styles.tipText, { color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)' }]}>
                            {tip.text}
                        </Text>
                    </View>
                ))}
            </View>
        </Animated.View>
    );
}

// ===== Loading skeleton =====
function SearchingSkeleton() {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    return (
        <Animated.View
            entering={FadeIn.duration(300)}
            exiting={FadeOut.duration(200)}
            style={styles.skeletonContainer}
        >
            <View style={styles.skeletonHeader}>
                <Waveform size={20} color={colors.primary} weight="fill" />
                <Text style={[styles.skeletonText, { color: colors.primary }]}>
                    Wingman is searching...
                </Text>
            </View>

            {[1, 2, 3].map(i => (
                <View
                    key={i}
                    style={[styles.skeletonCard, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
                    }]}
                >
                    <View style={[styles.skeletonPhoto, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                    }]} />
                    <View style={styles.skeletonLines}>
                        <View style={[styles.skeletonLine, {
                            width: '60%',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                        }]} />
                        <View style={[styles.skeletonLine, {
                            width: '80%',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        }]} />
                        <View style={[styles.skeletonLine, {
                            width: '45%',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                        }]} />
                    </View>
                </View>
            ))}
        </Animated.View>
    );
}

// ===== Error state =====
function SearchError({ error, onRetry }: { error: string; onRetry: () => void }) {
    const { colors } = useTheme();

    return (
        <Animated.View entering={FadeIn} style={styles.errorContainer}>
            <Text style={{ fontSize: 32 }}>😅</Text>
            <Text style={[styles.errorText, { color: colors.foreground }]}>
                Something went wrong
            </Text>
            <Text style={[styles.errorDetail, { color: colors.mutedForeground }]}>
                {error}
            </Text>
            <Pressable
                onPress={onRetry}
                style={[styles.retryButton, { backgroundColor: colors.primary }]}
            >
                <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
        </Animated.View>
    );
}

// ===== Main component =====
export function WingmanResults({
    matches,
    commentary,
    intent,
    meta,
    isSearching,
    searchError,
    currentQuery,
    onLoadMore,
    onMatchPress,
    onMatchLike,
    onRefine,
}: WingmanResultsProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    // No search yet
    if (!currentQuery && !isSearching) {
        return <WingmanEmptyState />;
    }

    // Searching
    if (isSearching && matches.length === 0) {
        return <SearchingSkeleton />;
    }

    // Error
    if (searchError && matches.length === 0) {
        return (
            <SearchError
                error={searchError}
                onRetry={() => onRefine?.(currentQuery || '')}
            />
        );
    }

    // Results
    return (
        <Animated.View entering={FadeIn.duration(300)} style={styles.resultsContainer}>
            {/* Commentary banner */}
            {commentary && (
                <Animated.View
                    entering={SlideInUp.springify().damping(20)}
                    style={[styles.commentaryBanner, {
                        backgroundColor: isDark
                            ? 'rgba(233, 30, 140, 0.08)'
                            : 'rgba(233, 30, 140, 0.05)',
                        borderColor: isDark
                            ? 'rgba(233, 30, 140, 0.15)'
                            : 'rgba(233, 30, 140, 0.1)',
                    }]}
                >
                    <View style={styles.commentaryHeader}>
                        <Sparkle size={16} color={colors.primary} weight="fill" />
                        <Text style={[styles.commentaryLabel, { color: colors.primary }]}>
                            Wingman says
                        </Text>
                    </View>
                    <Text style={[styles.commentaryText, {
                        color: isDark ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.75)',
                    }]}>
                        {commentary}
                    </Text>
                </Animated.View>
            )}

            {/* Results header */}
            <View style={styles.resultsHeader}>
                <Text style={[styles.resultsCount, { color: colors.mutedForeground }]}>
                    {meta?.totalFound || matches.length} match{(meta?.totalFound || matches.length) !== 1 ? 'es' : ''} found
                </Text>
                {intent && (
                    <View style={[styles.vibeBadge, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    }]}>
                        <Lightning size={12} color={colors.primary} weight="fill" />
                        <Text style={[styles.vibeText, { color: colors.mutedForeground }]}>
                            {intent.vibe}
                        </Text>
                    </View>
                )}
            </View>

            {/* Match cards */}
            {matches.map((match, index) => (
                <WingmanMatchCard
                    key={match.profile.userId}
                    match={match}
                    index={index}
                    onPress={onMatchPress}
                    onLike={onMatchLike}
                />
            ))}

            {/* Load more button */}
            {meta?.hasMore && (
                <Pressable
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onLoadMore();
                    }}
                    disabled={isSearching}
                    style={[styles.loadMoreButton, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                        opacity: isSearching ? 0.5 : 1,
                    }]}
                >
                    {isSearching ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <>
                            <ArrowDown size={16} color={colors.primary} />
                            <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                                Show more matches
                            </Text>
                        </>
                    )}
                </Pressable>
            )}

            {/* Refine suggestions */}
            {!meta?.hasMore && matches.length > 0 && (
                <View style={styles.refineSection}>
                    <Text style={[styles.refineLabel, { color: colors.mutedForeground }]}>
                        Try refining your search
                    </Text>
                    <View style={styles.refineSuggestions}>
                        {getRefineQueries(currentQuery || '', intent?.vibe).map((q, i) => (
                            <Pressable
                                key={i}
                                onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    onRefine?.(q);
                                }}
                                style={[styles.refineChip, {
                                    backgroundColor: isDark
                                        ? 'rgba(255,255,255,0.06)'
                                        : 'rgba(0,0,0,0.04)',
                                    borderColor: isDark
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'rgba(0,0,0,0.06)',
                                }]}
                            >
                                <Text style={[styles.refineChipText, { color: colors.foreground }]}>
                                    {q}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>
            )}

            {/* Bottom spacer */}
            <View style={{ height: 100 }} />
        </Animated.View>
    );
}

// Generate 2-3 refine queries based on current search
function getRefineQueries(currentQuery: string, vibe?: string): string[] {
    const refinements = [
        'more outgoing and social',
        'more introverted and chill',
        'into sports and fitness',
        'creative and artsy types',
        'tech and coding enthusiasts',
        'same year of study',
    ];

    // Pick 2-3 that don't overlap too much with current query
    const filtered = refinements.filter(
        r => !currentQuery.toLowerCase().includes(r.split(' ')[1])
    );

    return filtered.slice(0, 3);
}

const styles = StyleSheet.create({
    // Empty state
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 40,
        gap: 14,
    },
    emptyIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '800',
    },
    emptySubtitle: {
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
    },
    tipsContainer: {
        width: '100%',
        marginTop: 20,
        gap: 8,
    },
    tipsLabel: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 4,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
    },
    tipText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },

    // Skeleton
    skeletonContainer: {
        padding: 16,
        gap: 12,
    },
    skeletonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 8,
    },
    skeletonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    skeletonCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        gap: 14,
    },
    skeletonPhoto: {
        width: 80,
        height: 100,
        borderRadius: 14,
    },
    skeletonLines: {
        flex: 1,
        gap: 8,
        justifyContent: 'center',
    },
    skeletonLine: {
        height: 12,
        borderRadius: 6,
    },

    // Error
    errorContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 12,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '700',
    },
    errorDetail: {
        fontSize: 13,
        textAlign: 'center',
    },
    retryButton: {
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
        marginTop: 8,
    },
    retryText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },

    // Results
    resultsContainer: {
        padding: 16,
        gap: 0,
    },

    // Commentary
    commentaryBanner: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 14,
        marginBottom: 14,
        gap: 6,
    },
    commentaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    commentaryLabel: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    commentaryText: {
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },

    // Results header
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    resultsCount: {
        fontSize: 13,
        fontWeight: '600',
    },
    vibeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    vibeText: {
        fontSize: 12,
        fontWeight: '600',
    },

    // Load more
    loadMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
        borderWidth: 1,
        marginTop: 8,
    },
    loadMoreText: {
        fontSize: 14,
        fontWeight: '600',
    },

    // Refine
    refineSection: {
        marginTop: 20,
        gap: 10,
    },
    refineLabel: {
        fontSize: 13,
        fontWeight: '600',
    },
    refineSuggestions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    refineChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 14,
        borderWidth: 1,
    },
    refineChipText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
