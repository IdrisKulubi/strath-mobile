import React, { useCallback } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    StyleSheet,
    ActivityIndicator,
    Pressable,
    Alert,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { Match } from '@/hooks/use-matches';
import { RichMatchCard } from './rich-match-card';
import { Heart, Sparkle, MagnifyingGlass } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface RichMatchesListProps {
    matches: Match[];
    isLoading: boolean;
    isRefreshing: boolean;
    onRefresh: () => void;
    onMatchPress: (match: Match) => void;
    onExplore?: () => void;
    onEndReached?: () => void;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
}

// Enhanced loading skeleton
function RichMatchSkeleton({ index }: { index: number }) {
    const { isDark } = useTheme();
    
    return (
        <Animated.View 
            entering={FadeIn.delay(index * 100)} 
            style={[
                styles.skeletonCard,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff' }
            ]}
        >
            <Skeleton width={68} height={68} borderRadius={34} />
            <View style={styles.skeletonContent}>
                <Skeleton width={140} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={80} height={14} borderRadius={8} style={{ marginBottom: 8 }} />
                <Skeleton width={200} height={14} borderRadius={4} style={{ marginBottom: 8 }} />
                <View style={styles.skeletonBottom}>
                    <Skeleton width={60} height={24} borderRadius={10} />
                    <Skeleton width={50} height={20} borderRadius={8} />
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
            {/* Animated hearts background */}
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
                No Connections yet
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                When you and someone else both want to connect, you&apos;ll see them here. Keep exploring!
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

            {/* Fun tip */}
            <View style={[
                styles.tipContainer,
                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.03)' }
            ]}>
                <Sparkle size={18} color="#f59e0b" weight="fill" />
                <Text style={[styles.tipText, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                    Pro tip: Complete your profile to get 3x more connections!
                </Text>
            </View>
        </View>
    );
}

// List header with stats
function ListHeader({ matchCount }: { matchCount: number }) {
    const { isDark } = useTheme();
    
    if (matchCount === 0) return null;

    return (
        <View style={styles.listHeader}>
            <View style={styles.statsRow}>
                <View style={[
                    styles.statBadge,
                    { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }
                ]}>
                    <Heart size={14} color="#ec4899" weight="fill" />
                    <Text style={[styles.statText, { color: '#ec4899' }]}>
                        {matchCount} {matchCount === 1 ? 'match' : 'matches'}
                    </Text>
                </View>
            </View>
            <Text style={[styles.swipeHint, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                Swipe cards to archive or unmatch
            </Text>
        </View>
    );
}

export function RichMatchesList({
    matches,
    isLoading,
    isRefreshing,
    onRefresh,
    onMatchPress,
    onExplore,
    onEndReached,
    hasNextPage,
    isFetchingNextPage,
}: RichMatchesListProps) {
    const { colors, isDark } = useTheme();

    const handleArchive = useCallback((match: Match) => {
        // For now, just show feedback - you can implement actual archive logic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('Archived', `${match.partner.name} has been archived`);
    }, []);

    const handleUnmatch = useCallback((match: Match) => {
        Alert.alert(
            'Unmatch',
            `Are you sure you want to unmatch with ${match.partner.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unmatch',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Implement unmatch logic here
                    },
                },
            ]
        );
    }, []);

    const renderItem = useCallback(({ item, index }: { item: Match; index: number }) => (
        <Animated.View
            entering={FadeIn.delay(index * 50)}
            layout={Layout.springify()}
        >
            <RichMatchCard
                match={item}
                onPress={onMatchPress}
                onArchive={handleArchive}
                onUnmatch={handleUnmatch}
            />
        </Animated.View>
    ), [onMatchPress, handleArchive, handleUnmatch]);

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

    const renderHeader = useCallback(() => (
        <ListHeader matchCount={matches.length} />
    ), [matches.length]);

    // Loading state
    if (isLoading && !isRefreshing) {
        return (
            <View style={styles.loadingContainer}>
                {[0, 1, 2, 3].map((i) => (
                    <RichMatchSkeleton key={i} index={i} />
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
        paddingTop: 16,
        paddingHorizontal: 16,
        gap: 12,
    },
    skeletonCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        minHeight: 120,
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
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12,
    },
    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    statBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6,
    },
    statText: {
        fontSize: 13,
        fontWeight: '600',
    },
    swipeHint: {
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
