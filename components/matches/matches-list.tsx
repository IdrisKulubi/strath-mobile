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
import { MatchItem } from './match-item';
import { Heart } from 'phosphor-react-native';

interface MatchesListProps {
    matches: Match[];
    isLoading: boolean;
    isRefreshing: boolean;
    onRefresh: () => void;
    onMatchPress: (match: Match) => void;
    onEndReached?: () => void;
    hasNextPage?: boolean;
    isFetchingNextPage?: boolean;
}

// Loading skeleton component
function MatchSkeleton() {
    return (
        <View style={styles.skeletonContainer}>
            <Skeleton width={52} height={52} borderRadius={26} />
            <View style={styles.skeletonContent}>
                <Skeleton width={120} height={18} borderRadius={4} style={{ marginBottom: 8 }} />
                <Skeleton width={200} height={14} borderRadius={4} />
            </View>
        </View>
    );
}

// Empty state component
function EmptyState({ onExplore }: { onExplore?: () => void }) {
    const { colors } = useTheme();

    return (
        <View style={styles.emptyContainer}>
            <View style={[styles.emptyIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Heart size={48} color={colors.primary} />
            </View>
            <Text className="text-foreground text-xl font-bold text-center mt-4">
                No Connections yet
            </Text>
            <Text className="text-muted-foreground text-center mt-2 px-8">
                Keep exploring! When you and someone else both want to connect, you&apos;ll see them here.
            </Text>
            {onExplore && (
                <Pressable
                    style={[styles.exploreButton, { backgroundColor: colors.primary }]}
                    onPress={onExplore}
                >
                    <Text className="text-white font-semibold text-base">
                        Start Exploring
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

// Error state component
function ErrorState({ onRetry }: { onRetry: () => void }) {
    const { colors } = useTheme();

    return (
        <View style={styles.emptyContainer}>
            <Text className="text-foreground text-xl font-bold text-center">
                Something went wrong
            </Text>
            <Text className="text-muted-foreground text-center mt-2">
                We couldn&apos;t load your connections
            </Text>
            <Pressable
                style={[styles.retryButton, { borderColor: colors.primary }]}
                onPress={onRetry}
            >
                <Text className="text-primary font-semibold text-base">
                    Try Again
                </Text>
            </Pressable>
        </View>
    );
}

export function MatchesList({
    matches,
    isLoading,
    isRefreshing,
    onRefresh,
    onMatchPress,
    onEndReached,
    hasNextPage,
    isFetchingNextPage,
}: MatchesListProps) {
    const { colors } = useTheme();

    const renderItem = useCallback(({ item }: { item: Match }) => (
        <MatchItem match={item} onPress={onMatchPress} />
    ), [onMatchPress]);

    const keyExtractor = useCallback((item: Match) => item.id, []);

    const getItemLayout = useCallback((_: unknown, index: number) => ({
        length: 76, // fixed height
        offset: 76 * index,
        index,
    }), []);

    const renderFooter = useCallback(() => {
        if (!isFetchingNextPage) return null;
        return (
            <View style={styles.footer}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    }, [isFetchingNextPage, colors.primary]);

    const renderSeparator = useCallback(() => (
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
    ), [colors.border]);

    // Loading state
    if (isLoading && !isRefreshing) {
        return (
            <View style={styles.loadingContainer}>
                {[1, 2, 3, 4, 5].map((i) => (
                    <MatchSkeleton key={i} />
                ))}
            </View>
        );
    }

    // Empty state
    if (!isLoading && matches.length === 0) {
        return <EmptyState />;
    }

    return (
        <FlatList
            data={matches}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            ItemSeparatorComponent={renderSeparator}
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
            contentContainerStyle={matches.length === 0 ? styles.emptyList : undefined}
        />
    );
}

// Export sub-components for flexibility
export { EmptyState, ErrorState, MatchSkeleton };

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        paddingTop: 8,
    },
    skeletonContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        height: 76,
    },
    skeletonContent: {
        marginLeft: 12,
        flex: 1,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyList: {
        flexGrow: 1,
    },
    exploreButton: {
        marginTop: 24,
        paddingHorizontal: 32,
        paddingVertical: 14,
        borderRadius: 12,
    },
    retryButton: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 2,
    },
    separator: {
        height: StyleSheet.hairlineWidth,
        marginLeft: 80, // Align with content after avatar
    },
    footer: {
        paddingVertical: 16,
        alignItems: 'center',
    },
});
