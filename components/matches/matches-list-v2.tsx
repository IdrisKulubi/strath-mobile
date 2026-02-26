import React, { useCallback } from 'react';
import {
    View,
    FlatList,
    RefreshControl,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
    Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { Match } from '@/hooks/use-matches';
import { MatchCard } from './match-card';
import { Heart } from 'phosphor-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeIn, Layout } from 'react-native-reanimated';

interface MatchesListV2Props {
    matches: Match[];
    isLoading: boolean;
    isRefreshing: boolean;
    onRefresh: () => void;
    onMatchPress: (match: Match) => void;
    onArchive?: (match: Match) => void;
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

function EmptyState() {
    const { isDark } = useTheme();

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.emptyScroll}
        >
            {/* Concentric ring hero */}
            <View style={styles.emptyHeroWrapper}>
                <View style={[styles.emptyRing3, { borderColor: isDark ? 'rgba(236,72,153,0.07)' : 'rgba(236,72,153,0.06)' }]} />
                <View style={[styles.emptyRing2, { borderColor: isDark ? 'rgba(236,72,153,0.13)' : 'rgba(236,72,153,0.10)' }]} />
                <View style={[styles.emptyRing1, { borderColor: isDark ? 'rgba(236,72,153,0.20)' : 'rgba(236,72,153,0.16)' }]} />
                <LinearGradient
                    colors={['#f472b6', '#f43f5e']}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyHeartGradient}
                >
                    <Heart size={44} color="#fff" weight="fill" />
                </LinearGradient>
            </View>

            <Text style={[styles.emptyTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                Your connections are simmering
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                A special match could be a like away. Need help? Ask your Wingman for a profile boost.
            </Text>
        </ScrollView>
    );
}

export function MatchesListV2({
    matches,
    isLoading,
    isRefreshing,
    onRefresh,
    onMatchPress,
    onArchive,
    onEndReached,
    hasNextPage,
    isFetchingNextPage,
}: MatchesListV2Props) {
    const { colors, isDark } = useTheme();

    const renderRightActions = useCallback((item: Match) => (
        <View style={styles.swipeActionWrap}>
            <Pressable
                onPress={() => onArchive?.(item)}
                style={({ pressed }) => [styles.archiveSwipeBtn, { opacity: pressed ? 0.88 : 1 }]}
            >
                <Text style={styles.archiveSwipeText}>Archive</Text>
            </Pressable>
        </View>
    ), [onArchive]);

    const renderItem = useCallback(({ item, index }: { item: Match; index: number }) => (
        <Animated.View
            entering={FadeIn.delay(index * 50)}
            layout={Layout.springify()}
        >
            <Swipeable
                renderRightActions={() => renderRightActions(item)}
                overshootRight={false}
                rightThreshold={48}
                enabled={Boolean(onArchive)}
            >
                <MatchCard
                    match={item}
                    onPress={onMatchPress}
                    showOptions={false}
                />
            </Swipeable>
        </Animated.View>
    ), [onMatchPress, onArchive, renderRightActions]);

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
        return <EmptyState />;
    }

    return (
        <FlatList
            data={matches}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
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
    // ── Empty State ────────────────────────────────────────────────────────
    emptyScroll: {
        flexGrow: 1,
        alignItems: 'center',
        paddingTop: 48,
        paddingHorizontal: 24,
        paddingBottom: 60,
    },
    emptyHeroWrapper: {
        width: 200,
        height: 200,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
    },
    emptyRing3: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 1,
    },
    emptyRing2: {
        position: 'absolute',
        width: 156,
        height: 156,
        borderRadius: 78,
        borderWidth: 1.5,
    },
    emptyRing1: {
        position: 'absolute',
        width: 116,
        height: 116,
        borderRadius: 58,
        borderWidth: 1.5,
    },
    emptyHeartGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.45,
        shadowRadius: 18,
        elevation: 12,
    },
    emptyTitle: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.4,
        lineHeight: 34,
        paddingTop: 2,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 23,
        marginBottom: 8,
        maxWidth: 300,
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
    swipeActionWrap: {
        justifyContent: 'center',
        alignItems: 'flex-end',
        paddingRight: 16,
        marginVertical: 4,
    },
    archiveSwipeBtn: {
        minWidth: 88,
        height: 96,
        borderRadius: 16,
        backgroundColor: 'rgba(236,72,153,0.92)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    archiveSwipeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
});
