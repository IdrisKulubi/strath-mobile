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
import { type Mission } from '@/hooks/use-missions';
import { SwipeableMatchCard } from './swipeable-match-card';
import { ActiveMissionsStrip } from './active-missions-strip';
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
    /** Map of matchId → Mission for badge display & missions strip */
    missionsByMatchId?: Record<string, Mission>;
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

// Redesigned empty state — Apple-level polish
const HOW_IT_WORKS = [
    { emoji: '🔍', title: 'Find someone you like', desc: 'Browse profiles on Find and send a connection request' },
    { emoji: '💌', title: 'They accept your request', desc: "If they like you back, boom — you're a match!" },
    { emoji: '💬', title: 'Start the conversation', desc: 'Break the ice and see where it takes you' },
];

function EmptyState({ onExplore }: { onExplore?: () => void }) {
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
                Your matches live here
            </Text>
            <Text style={[styles.emptySubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                The moment someone accepts your request — or you accept theirs — you'll see them right here.
            </Text>

            {onExplore && (
                <Pressable
                    onPress={onExplore}
                    style={{ borderRadius: 18, overflow: 'hidden', marginBottom: 40 }}
                >
                    <LinearGradient
                        colors={['#ec4899', '#f43f5e']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.exploreButton}
                    >
                        <MagnifyingGlass size={20} color="#fff" weight="bold" />
                        <Text style={styles.exploreButtonText}>Find Someone</Text>
                    </LinearGradient>
                </Pressable>
            )}

            {/* How matching works */}
            <View style={[
                styles.howSection,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
            ]}>
                <Text style={[styles.howSectionLabel, { color: isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)' }]}>
                    HOW MATCHING WORKS
                </Text>
                {HOW_IT_WORKS.map((step, i) => (
                    <View key={i} style={[styles.stepRow, i < HOW_IT_WORKS.length - 1 && styles.stepRowBorder, { borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
                        <View style={[styles.stepEmojiBox, { backgroundColor: isDark ? 'rgba(236,72,153,0.12)' : 'rgba(236,72,153,0.07)' }]}>
                            <Text style={styles.stepEmoji}>{step.emoji}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.stepTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                {step.title}
                            </Text>
                            <Text style={[styles.stepDesc, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                                {step.desc}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            {/* Pro tip */}
            <View style={[styles.tipRow, { backgroundColor: isDark ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.07)', borderColor: isDark ? 'rgba(245,158,11,0.20)' : 'rgba(245,158,11,0.18)' }]}>
                <Text style={styles.tipEmoji}>✨</Text>
                <Text style={[styles.tipText, { color: isDark ? '#fbbf24' : '#92400e' }]}>
                    Complete your profile to get 3× more connections
                </Text>
            </View>
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
    onUnmatch,
    onExplore,
    onEndReached,
    hasNextPage,
    isFetchingNextPage,
    missionsByMatchId,
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
                mission={missionsByMatchId?.[item.id]}
            />
        </Animated.View>
    ), [onMatchPress, onArchive, onUnmatch, missionsByMatchId]);

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
            <View>
                {/* Active Missions horizontal strip */}
                <ActiveMissionsStrip
                    byMatchId={missionsByMatchId}
                    matches={matches}
                />
                <View style={styles.listHeader}>
                    <Text style={[styles.hintText, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                        ← Swipe left on a card for options
                    </Text>
                </View>
            </View>
        );
    }, [matches, isDark, missionsByMatchId]);

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
        marginBottom: 32,
        maxWidth: 300,
    },
    exploreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 18,
        gap: 8,
        shadowColor: '#ec4899',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    exploreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: -0.2,
    },
    // How it works section
    howSection: {
        width: '100%',
        borderRadius: 20,
        borderWidth: 1,
        padding: 18,
        marginBottom: 16,
    },
    howSectionLabel: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 16,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        paddingBottom: 14,
    },
    stepRowBorder: {
        borderBottomWidth: 1,
        marginBottom: 14,
    },
    stepEmojiBox: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepEmoji: {
        fontSize: 20,
    },
    stepTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    stepDesc: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '400',
    },
    // Pro tip row
    tipRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 8,
    },
    tipEmoji: { fontSize: 15 },
    tipText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
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
