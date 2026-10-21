import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMinimizeOnScroll } from 'expo-glass-tabs';
import Animated from 'react-native-reanimated';
import { useQueryClient } from '@tanstack/react-query';

import { AiConsentCard } from '@/components/ai/ai-consent-card';
import { HomeHeader } from '@/components/home/home-header';
import { MatchmakerHomeShell } from '@/components/matchmaker';
import { MatchmakerHomeBackground } from '@/components/matchmaker/matchmaker-home-background';
import { MatchmakerHeader } from '@/components/matchmaker/matchmaker-header';
import { MatchmakerStatePanel } from '@/components/matchmaker/matchmaker-state-panel';
import { getGlassTabBarHeight } from '@/components/navigation/glass-tab-bar';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useAiConsent } from '@/hooks/use-ai-consent';
import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import {
    MATCHMAKER_AI_CONSENT_DESCRIPTION,
    MATCHMAKER_AI_CONSENT_DISCLOSURE,
    MATCHMAKER_AI_CONSENT_TITLE,
} from '@/lib/ai-consent';
import { MATCHMAKER_HOME, SPACING } from '@/lib/design-tokens';
import { shouldEnableMatchmakerQuery } from '@/lib/matchmaker/conversation-ui';
import { DailyRecommendationsPreview } from '@/components/discovery/daily-recommendations-preview';
import { DailyMatchesList } from '@/components/home/daily-matches-list';
import { DateHoldCard } from '@/components/home/date-hold-card';
import { MeetupSlotConfirmModal } from '@/components/dates/meetup-slot-confirm-modal';
import { ManualCurationCard } from '@/components/home/manual-curation-card';
import { HomeTabSwitcher, type HomeTab } from '@/components/home/home-tab-switcher';
import { InterestedInYouSection } from '@/components/home/interested-in-you-section';
import { DecisionInfoSheet, type DecisionSheetType } from '@/components/home/decision-info-sheet';
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
import { useHomeExperience } from '@/context/home-experience-context';
import { apiFetch } from '@/lib/api-client';

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

function MatchmakerHomeScreen() {
    const router = useRouter();
    const insets = useSafeAreaInsets();
    const tabBarHeight = getGlassTabBarHeight(insets.bottom);
    const onScroll = useMinimizeOnScroll();
    const {
        hasAiConsent,
        grantAiConsent,
        isAiConsentLoading,
        isAiConsentUpdating,
    } = useAiConsent();
    const conversationEnabled = shouldEnableMatchmakerQuery(hasAiConsent, isAiConsentLoading);

    const handleAllowAi = useCallback(async () => {
        try {
            await grantAiConsent();
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to update AI consent';
            Alert.alert('Matchmaker', message);
        }
    }, [grantAiConsent]);

    return (
        <TabSwipeView route="/(tabs)">
            <View style={styles.matchmakerScreen}>
                <MatchmakerHomeBackground />
                <StatusBar
                    barStyle="light-content"
                    translucent
                    backgroundColor="transparent"
                />
                <KeyboardAvoidingView
                    style={styles.keyboardAvoider}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.matchmakerHost}>
                        {isAiConsentLoading ? (
                            <>
                                <MatchmakerHeader session={null} visualState="thinking" />
                                <View style={[styles.centeredState, { paddingBottom: tabBarHeight }]}>
                                    <MatchmakerStatePanel variant="loading" />
                                </View>
                            </>
                        ) : !hasAiConsent ? (
                            <>
                                <MatchmakerHeader session={null} visualState="idle" />
                                <Animated.ScrollView
                                    onScroll={onScroll}
                                    scrollEventThrottle={16}
                                    contentContainerStyle={[
                                        styles.consentContent,
                                        { paddingBottom: tabBarHeight + SPACING.xl },
                                    ]}
                                    keyboardShouldPersistTaps="handled"
                                    showsVerticalScrollIndicator={false}
                                >
                            <AiConsentCard
                                title={MATCHMAKER_AI_CONSENT_TITLE}
                                description={MATCHMAKER_AI_CONSENT_DESCRIPTION}
                                disclosure={MATCHMAKER_AI_CONSENT_DISCLOSURE}
                                allowLabel="Allow matchmaker"
                                tone="matchmaker-dark"
                                isLoading={isAiConsentUpdating}
                                onAllow={handleAllowAi}
                                onOpenPrivacy={() => router.push('/legal?section=privacy')}
                            />
                                </Animated.ScrollView>
                            </>
                        ) : (
                            <MatchmakerHomeShell conversationEnabled={conversationEnabled} />
                        )}
                    </View>
                </KeyboardAvoidingView>
            </View>
        </TabSwipeView>
    );
}

function LegacyHomeScreen() {
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
    const [, setCarouselIndex] = useState(0);
    const [, setInterestedCarouselIndex] = useState(0);
    const [homeTab, setHomeTab] = useState<HomeTab>('today');
    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const tabBarHeight = getGlassTabBarHeight(insets.bottom);
    const onScroll = useMinimizeOnScroll();

    const { data: profile } = useProfile();
    const dailyMatches = useDailyMatches();
    const connectionRequests = useConnectionRequests();
    const refetchConnectionRequests = connectionRequests.refetch;
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
        void refetchConnectionRequests();
        void queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
    }, [homeTab, queryClient, refetchConnectionRequests]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                dailyMatches.refetch(),
                dailyRecommendations.refetch(),
                refetchConnectionRequests(),
                queryClient.invalidateQueries({ queryKey: ['notificationCounts'] }),
            ]);
        } finally {
            setRefreshing(false);
        }
    }, [dailyMatches, dailyRecommendations, queryClient, refetchConnectionRequests]);

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
                <Animated.ScrollView
                    onScroll={onScroll}
                    scrollEventThrottle={16}
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
                </Animated.ScrollView>

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

export default function HomeScreen() {
    const { isV2Enabled, isLoading } = useHomeExperience();

    useEffect(() => {
        if (isLoading) return;
        void apiFetch('/api/analytics/home-experience', {
            method: 'POST',
            body: { event: 'exposed', version: isV2Enabled ? 'v2' : 'v1' },
        }).catch((error) => {
            console.warn('[home-experience] Failed to record exposure:', error);
        });
    }, [isLoading, isV2Enabled]);

    if (isLoading) {
        return (
            <SafeAreaView style={styles.versionGate} edges={['top']}>
                <HomeSkeleton />
            </SafeAreaView>
        );
    }

    return isV2Enabled ? <MatchmakerHomeScreen /> : <LegacyHomeScreen />;
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
    matchmakerScreen: {
        flex: 1,
        backgroundColor: MATCHMAKER_HOME.background,
        overflow: 'hidden',
    },
    keyboardAvoider: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    matchmakerHost: {
        flex: 1,
        minHeight: 0,
        backgroundColor: 'transparent',
    },
    centeredState: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.xl,
    },
    consentContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.large,
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
    versionGate: {
        flex: 1,
        backgroundColor: MATCHMAKER_HOME.background,
        paddingTop: SPACING.base,
    },
});
