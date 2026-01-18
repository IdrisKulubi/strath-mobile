import React, { useCallback } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    StyleSheet,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { Match } from '@/hooks/use-matches';
import { SwipeableMatchCard } from './swipeable-match-card';
import { Heart, Sparkle, MagnifyingGlass } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

interface MatchesListV2Props {
    matches: Match[];
    isLoading: boolean;
    isRefreshing: boolean;
    onRefresh: () => void;
    onMatchPress: (match: Match) => void;
    onArchive?: (match: Match) => void;
    onUnmatch?: (match: Match) => void;
    onExplore?: () => void;
    onEndReached?: () => void;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
}

// Enhanced loading skeleton
function MatchSkeleton({ index }: { index: number }) {
    const { isDark } = useTheme();
    
    return (
        <Animated.View 
            entering={FadeIn.delay(index * 100)} 
            style={[
                styles.skeletonCard,
                { 
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                    borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                }
            ]}
        >
            <Skeleton width={64} height={64} borderRadius={32} />
            <View style={styles.skeletonContent}>
                <Skeleton width={140} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={80} height={14} borderRadius={8} style={{ marginBottom: 8 }} />
                <Skeleton width={180} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <View style={styles.skeletonBottom}>
                    <Skeleton width={60} height={24} borderRadius={10} />
                    <Skeleton width={50} height={20} borderRadius={8} />
                </View>
            </View>
        </Animated.View>
    );
}

// Enhanced empty state
function EmptyState({ onExplore }: { onExplore?: () => void }) {
    const { isDark } = useTheme();

    return (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconWrapper}>
                <LinearGradient
                    colors={['rgba(236, 72, 153, 0.2)', 'rgba(244, 63, 94, 0.2)']}
                    style={styles.emptyIconGlow}
                />
                <View style={[
                    styles.emptyIconContainer,
                    { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }
                ]}>
                    <Heart size={56} color="#ec4899" weight="fill" />
                </View>
            </View>

            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                No matches yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                When you and someone else both like each other, they&apos;ll appear here
            </Text>

            {onExplore && (
                <Pressable onPress={onExplore}>
                    <LinearGradient
                        colors={['#ec4899', '#f43f5e']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.exploreButton}
                    >
                        <MagnifyingGlass size={20} color="#fff" weight="bold" />
                        <Text style={styles.exploreButtonText}>Start Exploring</Text>
                    </LinearGradient>
                </Pressable>
            )}

            <View style={[
                styles.tipContainer,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)' }
            ]}>
                <Sparkle size={18} color="#f59e0b" weight="fill" />
                <Text style={[styles.tipText, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                    Pro tip: Complete your profile to get 3x more matches!
                </Text>
            </View>
        </View>
    );
}

export function MatchesListV2({
    matches,
    isLoading,
    isRefreshing,
    onRefresh,
    onMatchPress,
    onArchive,
    onUnmatch,
    onExplore,
    onEndReached,
    hasNextPage,
    isFetchingNextPage,
}: MatchesListV2Props) {
    const { colors, isDark } = useTheme();

    const renderItem = useCallback(({ item, index }: { item: Match; index: number }) => (
        <Animated.View
            entering={FadeIn.delay(index * 50)}
            layout={Layout.springify()}
        >
            <SwipeableMatchCard
                match={item}
                onPress={onMatchPress}
                onArchive={onArchive}
                onUnmatch={onUnmatch}
            />
        </Animated.View>
    ), [onMatchPress, onArchive, onUnmatch]);

    const keyExtractor = useCallback((item: Match) => item.id, []);

    const renderFooter = useCallback(() => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={[styles.footerText, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                    Loading more...
                </Text>
            </View>
        );
    }, [isFetchingNextPage, colors.primary, isDark]);

    const renderHeader = useCallback(() => {
        if (matches.length === 0) return null;
        return (
            <View style={styles.listHeader}>
                <Text style={[styles.hintText, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                    ← Swipe left on a card for options
                </Text>
            </View>
        );
    }, [matches.length, isDark]);

    // Loading state
    if (isLoading && !isRefreshing) {
        return (
            <View style={styles.loadingContainer}>
                {[0, 1, 2, 3].map((i) => (
                    <MatchSkeleton key={i} index={i} />
                ))}
            </View>
        );
    }

    // Empty state
    if (!isLoading && matches.length === 0) {
        return <EmptyState onExplore={onExplore} />;
    }

    return (
        <FlatList
            data={matches}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    onRefresh={onRefresh}
                    tintColor={colors.primary}
                    colors={[colors.primary]}
                />
            }
            onEndReached={hasNextPage ? onEndReached : undefined}
            onEndReachedThreshold={0.5}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
                styles.listContent,
                matches.length === 0 && styles.emptyList
            ]}
        />
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        paddingTop: 8,
    },
    skeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        minHeight: 110,
    },
    skeletonContent: {
        marginLeft: 14,
        flex: 1,
    },
    skeletonBottom: {
        flexDirection: 'row',
        gap: 8,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyIconWrapper: {
        position: 'relative',
        marginBottom: 24,
    },
    emptyIconGlow: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        top: -10,
        left: -10,
    },
    emptyIconContainer: {
        width: 120,
        height: 120,
        borderRadius: 60,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 28,
    },
    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        gap: 8,
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    exploreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 32,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 10,
    },
    tipText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },
    listHeader: {
        paddingHorizontal: 20,
        paddingTop: 4,
        paddingBottom: 8,
    },
    hintText: {
        fontSize: 12,
        fontWeight: '500',
    },
    listContent: {
        paddingBottom: 100,
    },
    emptyList: {
        flexGrow: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 20,
        gap: 8,
    },
    footerText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
