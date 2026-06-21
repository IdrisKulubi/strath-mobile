import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { HomeHeader } from '@/components/home/home-header';
import { HomeTabSwitcher, type HomeTab } from '@/components/home/home-tab-switcher';
import { InterestedInYouSection } from '@/components/home/interested-in-you-section';
import { DecisionInfoSheet, type DecisionSheetType } from '@/components/home/decision-info-sheet';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';
import { DailyRecommendationsPreview } from '@/components/discovery/daily-recommendations-preview';
import { DailyMatchesList } from '@/components/home/daily-matches-list';
import { DateHoldCard } from '@/components/home/date-hold-card';
import { MeetupSlotConfirmModal } from '@/components/dates/meetup-slot-confirm-modal';
import { ManualCurationCard } from '@/components/home/manual-curation-card';
import {
    DailyMatch,
    useDailyMatches,
    useRespondToDailyPair,
} from '@/hooks/use-daily-matches';
import {
    RankedRecommendation,
    RecommendationDecision,
    useDailyRecommendations,
    useRecommendationDecision,
} from '@/hooks/use-match-discovery';
import { useConnectionRequests } from '@/hooks/use-connection-requests';
import { useNotificationCounts } from '@/hooks/use-notification-counts';
import { useHomeIntroLayout } from '@/hooks/use-home-intro-layout';
import { SPACING } from '@/lib/design-tokens';

function HomeSkeleton() {
    return (
        <View style={styles.skeletonWrap}>
            <Skeleton style={styles.headerSkeleton} />
            <Skeleton style={styles.subheaderSkeleton} />
            {[0, 1].map((item) => (
                <Skeleton key={item} style={styles.cardSkeleton} />
            ))}
        </View>
    );
}

function parseHomeTab(value: string | string[] | undefined): HomeTab | null {
    const raw = Array.isArray(value) ? value[0] : value;
    if (raw === 'interested' || raw === 'today') return raw;
    return null;
}

export default function HomeScreen() {
    const { colors, colorScheme } = useTheme();
    const router = useRouter();
    const toast = useToast();
    const queryClient = useQueryClient();
    const isDark = colorScheme === 'dark';
    const params = useLocalSearchParams<{ homeTab?: string }>();

    const [infoSheet, setInfoSheet] = useState<{
        visible: boolean;
        type: DecisionSheetType;
        firstName?: string;
    }>({ visible: false, type: 'open_to_meet' });
    const [refreshing, setRefreshing] = useState(false);
    const [savedDecisions, setSavedDecisions] = useState<Record<string, RecommendationDecision>>({});
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [interestedCarouselIndex, setInterestedCarouselIndex] = useState(0);
    const [homeTab, setHomeTab] = useState<HomeTab>('today');
    const { height: windowHeight } = useWindowDimensions();
    const tabBarHeight = useBottomTabBarHeight();

    const { data: profile } = useProfile();
    const dailyMatches = useDailyMatches();
    const connectionRequests = useConnectionRequests();
    const { incomingLikes } = useNotificationCounts();
    const pairDecision = useRespondToDailyPair();
    const dailyRecommendations = useDailyRecommendations();
    const recommendationDecision = useRecommendationDecision();
    const priorityMatches = dailyMatches.data?.matches ?? [];
    const activeHold = dailyMatches.data?.hold ?? null;
    const needsConfirmGate = Boolean(
        activeHold?.slotConfirmation?.needsSlotConfirmation
        && !activeHold?.slotConfirmation?.viewerSlotConfirmed,
    );
    const hasPriorityMatch = priorityMatches.length > 0;
    const shouldShowRecommendations = !needsConfirmGate && !activeHold && !hasPriorityMatch;
    const recommendations = useMemo(
        () => shouldShowRecommendations ? (dailyRecommendations.data?.recommendations ?? []).slice(0, 5) : [],
        [dailyRecommendations.data?.recommendations, shouldShowRecommendations]
    );
    const incomingCount = connectionRequests.data?.length ?? incomingLikes;
    const interestedHasCarousel = incomingCount > 0;
    const showTodayCarousel =
        homeTab === 'today'
        && !needsConfirmGate
        && !activeHold
        && (hasPriorityMatch || (shouldShowRecommendations && recommendations.length > 0));
    const showInterestedCarousel = homeTab === 'interested' && interestedHasCarousel;
    const showCarousel = showTodayCarousel || showInterestedCarousel;
    const { cardHeight, headerCompact, itemWidthRatio } = useHomeIntroLayout();

    const scrollMinHeight = windowHeight - tabBarHeight;

    useEffect(() => {
        const tabFromParams = parseHomeTab(params.homeTab);
        if (tabFromParams) {
            setHomeTab(tabFromParams);
        }
    }, [params.homeTab]);

    useEffect(() => {
        setCarouselIndex(0);
    }, [hasPriorityMatch, recommendations.length, priorityMatches.length]);

    useEffect(() => {
        setInterestedCarouselIndex(0);
    }, [connectionRequests.data?.length, homeTab]);

    useEffect(() => {
        if (homeTab !== 'interested') return;
        void connectionRequests.refetch();
        void queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
    }, [homeTab, connectionRequests.refetch, queryClient]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dailyMatches.refetch(),
                dailyRecommendations.refetch(),
                connectionRequests.refetch(),
                queryClient.invalidateQueries({ queryKey: ['notificationCounts'] }),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [connectionRequests, dailyMatches, dailyRecommendations, queryClient]);

    const handleViewDailyMatchProfile = useCallback((match: DailyMatch) => {
        router.push({
            pathname: '/profile/[userId]',
            params: {
                userId: match.userId,
                pairId: match.pairId,
            },
        });
    }, [router]);

    const handleDailyMatchDecision = useCallback(async (
        match: DailyMatch,
        decision: 'open_to_meet' | 'passed'
    ) => {
        try {
            await pairDecision.mutateAsync({ pairId: match.pairId, decision });
            const message = decision === 'open_to_meet'
                ? `Interest saved for ${match.firstName}.`
                : `${match.firstName} passed.`;
            toast.show({
                message,
                variant: decision === 'passed' ? 'default' : 'success',
                position: 'top',
                size: 'medium',
            });
            setInfoSheet({
                visible: true,
                type: decision === 'passed' ? 'pass' : decision,
                firstName: match.firstName,
            });
        } catch {
            toast.show({
                message: 'Could not save that decision right now. Please try again.',
                variant: 'danger',
            });
        }
    }, [pairDecision, toast]);

    const handleViewRecommendationProfile = useCallback((recommendation: RankedRecommendation) => {
        router.push({
            pathname: '/profile/[userId]',
            params: {
                userId: recommendation.candidateUserId,
                source: 'daily_recommendations',
                matchType: recommendation.matchType,
            },
        });
    }, [router]);

    const handleRecommendationDecision = useCallback(async (
        recommendation: RankedRecommendation,
        decision: RecommendationDecision
    ) => {
        try {
            const { result } = await recommendationDecision.mutateAsync({
                candidateUserId: recommendation.candidateUserId,
                decision,
                source: 'daily_recommendations',
                matchType: recommendation.matchType,
            });

            setSavedDecisions((current) => ({
                ...current,
                [recommendation.candidateUserId]: decision,
            }));
            queryClient.setQueryData(
                ['recommendations', 'daily'],
                (old: { recommendations?: RankedRecommendation[] } | undefined) =>
                    old?.recommendations
                        ? {
                            ...old,
                            recommendations: old.recommendations.map((item) =>
                                item.candidateUserId === recommendation.candidateUserId
                                    ? { ...item, currentUserDecision: decision }
                                    : item
                            ),
                        }
                        : old
            );

            const firstName = recommendation.profilePreview.firstName;
            const message = result.mutualMatchCreated
                ? `It's mutual with ${firstName}. Check Dates.`
                : decision === 'open_to_meet'
                ? `Interest saved. We'll tell you if it becomes mutual.`
                : `${firstName} passed. Tomorrow's picks will learn from this.`;
            toast.show({
                message,
                variant: decision === 'passed' ? 'default' : 'success',
                position: 'top',
                size: 'medium',
                duration: result.mutualMatchCreated ? 3600 : 2600,
            });

            setInfoSheet({
                visible: true,
                type: decision === 'passed' ? 'pass' : decision,
                firstName,
            });
        } catch {
            toast.show({
                message: 'Could not save that decision right now. Please try again.',
                variant: 'danger',
            });
        }
    }, [queryClient, recommendationDecision, toast]);

    const todayContent = dailyMatches.isLoading || (shouldShowRecommendations && dailyRecommendations.isLoading) ? (
        <HomeSkeleton />
    ) : needsConfirmGate ? (
        <View style={styles.confirmGatePlaceholder} />
    ) : activeHold ? (
        <DateHoldCard hold={activeHold} />
    ) : hasPriorityMatch ? (
        <DailyMatchesList
            matches={priorityMatches}
            onOpenToMeet={(match) => handleDailyMatchDecision(match, 'open_to_meet')}
            onPass={(match) => handleDailyMatchDecision(match, 'passed')}
            onViewProfile={handleViewDailyMatchProfile}
            actionsDisabled={pairDecision.isPending}
            onFocusedIndexChange={setCarouselIndex}
            cardHeight={cardHeight}
            itemWidthRatio={itemWidthRatio}
        />
    ) : dailyMatches.data?.mode === 'manual_curation' && recommendations.length === 0 ? (
        <ManualCurationCard curation={dailyMatches.data.manualCuration} />
    ) : (
        <DailyRecommendationsPreview
            recommendations={recommendations}
            isError={dailyRecommendations.isError}
            savedDecisions={savedDecisions}
            onViewProfile={handleViewRecommendationProfile}
            onDecision={handleRecommendationDecision}
            actionsDisabled={recommendationDecision.isPending}
            onFocusedIndexChange={setCarouselIndex}
            cardHeight={cardHeight}
            itemWidthRatio={itemWidthRatio}
        />
    );

    const mainContent = homeTab === 'interested' ? (
        <InterestedInYouSection
            cardHeight={cardHeight}
            itemWidthRatio={itemWidthRatio}
            onFocusedIndexChange={setInterestedCarouselIndex}
            onSwitchToToday={() => setHomeTab('today')}
        />
    ) : (
        todayContent
    );

    return (
        <TabSwipeView route="/(tabs)">
            <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.content,
                        showCarousel && styles.contentCarousel,
                        { minHeight: scrollMinHeight },
                    ]}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={!showCarousel}
                >
                    <HomeHeader
                        firstName={profile?.firstName}
                        compact={showCarousel && headerCompact}
                    />

                    <HomeTabSwitcher
                        activeTab={homeTab}
                        onTabChange={setHomeTab}
                        interestedCount={incomingCount}
                    />

                    <View style={showCarousel ? styles.carouselHost : undefined}>
                        {mainContent}
                    </View>
                </ScrollView>

                <DecisionInfoSheet
                    visible={infoSheet.visible}
                    type={infoSheet.type}
                    firstName={infoSheet.firstName}
                    onClose={() => setInfoSheet((state) => ({ ...state, visible: false }))}
                />

                {needsConfirmGate && activeHold ? (
                    <MeetupSlotConfirmModal
                        visible
                        hold={activeHold}
                        onCancelHold={() => router.push('/(tabs)/dates')}
                    />
                ) : null}
            </SafeAreaView>
        </TabSwipeView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingBottom: 32,
    },
    contentCarousel: {
        flexGrow: 1,
        paddingBottom: 8,
    },
    carouselHost: {
        flex: 1,
        marginTop: -SPACING.tight,
    },
    skeletonWrap: {
        paddingHorizontal: 16,
        gap: 14,
    },
    headerSkeleton: {
        height: 120,
        borderRadius: 26,
        marginTop: 4,
    },
    subheaderSkeleton: {
        height: 14,
        width: '42%',
        borderRadius: 10,
        marginBottom: 10,
    },
    cardSkeleton: {
        height: 430,
        borderRadius: 24,
    },
    confirmGatePlaceholder: {
        minHeight: 120,
    },
});
