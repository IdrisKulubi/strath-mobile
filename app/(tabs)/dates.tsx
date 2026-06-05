import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, StatusBar, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenGradient } from '@/components/ui/screen-gradient';
import Animated, {
    FadeIn,
    Easing,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useMutualMatches, useDateHistory } from '@/hooks/use-date-requests';
import { useDailyMatches } from '@/hooks/use-daily-matches';
import { ConfirmedMatchCard } from '@/components/dates/confirmed-match-card';
import { ActionRequiredBanner } from '@/components/attention/action-required-banner';
import { RescheduleResponseBanner } from '@/components/attention/reschedule-response-banner';
import { MeetupSlotConfirmModal } from '@/components/dates/meetup-slot-confirm-modal';
import { RescheduleRespondModal } from '@/components/dates/reschedule-respond-modal';
import { HistoryCard } from '@/components/dates/history-card';
import { EmptyDates } from '@/components/dates/empty-dates';
import { Skeleton } from '@/components/ui/skeleton';
import { DateMatchModal } from '@/components/date-match/date-match-modal';
import { useProfile } from '@/hooks/use-profile';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';
import type { MutualDate } from '@/hooks/use-date-requests';
import { useNotificationPermissionPrompt } from '@/context/notification-permission-context';
import { findMutualMatchNeedingRescheduleResponse } from '@/hooks/use-reschedule';
import {
    clearRescheduleModalDismissed,
    isRescheduleModalDismissed,
    markRescheduleModalDismissed,
} from '@/lib/reschedule-dismissal';

type Section = 'mutual' | 'being_arranged' | 'upcoming' | 'history';

const SECTIONS: { key: Section; label: string }[] = [
    { key: 'mutual', label: 'Mutual' },
    { key: 'being_arranged', label: 'Arranging' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'history', label: 'History' },
];

function SectionSkeleton() {
    return (
        <View style={{ gap: 12, paddingHorizontal: 16, paddingTop: 8 }}>
            {[0, 1].map((i) => (
                <Skeleton key={i} style={{ height: 140, borderRadius: 20 }} />
            ))}
        </View>
    );
}

export default function DatesScreen() {
    const router = useRouter();
    const { rescheduleRequestId } = useLocalSearchParams<{ rescheduleRequestId?: string }>();
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const [activeSection, setActiveSection] = useState<Section>('mutual');
    const [refreshing, setRefreshing] = useState(false);
    const [isHydratingSections, setIsHydratingSections] = useState(true);

    const indicatorX = useSharedValue(0);
    const segmentWidth = useRef(0);

    const { data: myProfile } = useProfile();
    const { data: mutualDates = [], isLoading: loadingMutuals, isFetching: fetchingMutuals, refetch: refetchMutuals } = useMutualMatches();
    const { data: history = [], isLoading: loadingHistory, refetch: refetchHistory } = useDateHistory();

    const [matchModalVisible, setMatchModalVisible] = useState(false);
    const [celebrationMatch, setCelebrationMatch] = useState<MutualDate | null>(null);
    const [confirmModalVisible, setConfirmModalVisible] = useState(false);
    const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
    const [rescheduleTarget, setRescheduleTarget] = useState<MutualDate | null>(null);
    const seenMatchIds = useRef<Set<string>>(new Set());
    const autoPresentedRequestId = useRef<string | null>(null);

    const { promptIfAppropriate } = useNotificationPermissionPrompt();
    const dailyMatches = useDailyMatches();
    const activeHold = dailyMatches.data?.hold ?? null;
    const holdReschedulePending = activeHold?.slotConfirmation?.reschedule?.pending;
    const holdNeedsRescheduleResponse = Boolean(holdReschedulePending?.isYourTurnToRespond);

    const mutualNeedingReschedule = useMemo(
        () => findMutualMatchNeedingRescheduleResponse(mutualDates),
        [mutualDates],
    );

    const showSlotConfirmBanner = Boolean(
        activeHold?.slotConfirmation?.needsSlotConfirmation
        && !activeHold?.slotConfirmation?.viewerSlotConfirmed
        && activeHold?.slotConfirmation?.confirmWindowOpen,
    );

    const showRescheduleBanner = Boolean(
        !showSlotConfirmBanner
        && (holdNeedsRescheduleResponse || mutualNeedingReschedule),
    );

    const sections = useMemo(() => ({
        mutual: mutualDates.filter((item) => item.arrangementStatus === 'mutual'),
        being_arranged: mutualDates.filter((item) => item.arrangementStatus === 'being_arranged'),
        upcoming: mutualDates.filter((item) => item.arrangementStatus === 'upcoming'),
    }), [mutualDates]);

    useFocusEffect(
        useCallback(() => {
            let isActive = true;

            const syncLatestDatesState = async () => {
                setIsHydratingSections(true);
                try {
                    await Promise.all([refetchMutuals(), refetchHistory()]);
                } finally {
                    if (isActive) {
                        setIsHydratingSections(false);
                    }
                }
            };

            syncLatestDatesState();

            return () => {
                isActive = false;
            };
        }, [refetchHistory, refetchMutuals]),
    );

    useEffect(() => {
        const newMutual = sections.mutual.find((item) => !seenMatchIds.current.has(item.id));
        if (!newMutual || isHydratingSections || fetchingMutuals) return;
        seenMatchIds.current.add(newMutual.id);
        setCelebrationMatch(newMutual);
        setTimeout(() => setMatchModalVisible(true), 400);
        void promptIfAppropriate({
            context: 'mutual_match',
            partnerName: newMutual.withUser.firstName,
        });
    }, [fetchingMutuals, isHydratingSections, promptIfAppropriate, sections.mutual]);

    const openRescheduleModalForMatch = useCallback((match: MutualDate) => {
        const pending = match.reschedule?.pending;
        if (!pending?.isYourTurnToRespond) return;
        setRescheduleTarget(match);
        setRescheduleModalVisible(true);
    }, []);

    const handleCloseRescheduleModal = useCallback(() => {
        const requestId = rescheduleTarget?.reschedule?.pending?.requestId;
        if (requestId) {
            void markRescheduleModalDismissed(requestId);
        }
        setRescheduleModalVisible(false);
        setRescheduleTarget(null);
        if (rescheduleRequestId) {
            router.setParams({ rescheduleRequestId: undefined });
        }
    }, [rescheduleRequestId, rescheduleTarget?.reschedule?.pending?.requestId, router]);

    useEffect(() => {
        if (isHydratingSections || loadingMutuals) return;

        const fromQuery = typeof rescheduleRequestId === 'string' ? rescheduleRequestId : undefined;
        const pendingRequestId =
            fromQuery
            ?? holdReschedulePending?.requestId
            ?? mutualNeedingReschedule?.reschedule?.pending?.requestId;

        if (!pendingRequestId) return;
        if (autoPresentedRequestId.current === pendingRequestId && rescheduleModalVisible) return;

        const match =
            mutualDates.find((m) => m.reschedule?.pending?.requestId === pendingRequestId)
            ?? (holdNeedsRescheduleResponse && activeHold
                ? ({
                      id: activeHold.mutualMatchId,
                      withUser: {
                          id: activeHold.partnerUserId,
                          firstName: activeHold.partner.firstName ?? 'your match',
                      },
                      reschedule: activeHold.slotConfirmation.reschedule,
                  } as MutualDate)
                : mutualNeedingReschedule);

        if (!match?.reschedule?.pending?.isYourTurnToRespond) return;

        let cancelled = false;
        void (async () => {
            const dismissed = await isRescheduleModalDismissed(pendingRequestId);
            if (cancelled || dismissed) return;
            autoPresentedRequestId.current = pendingRequestId;
            openRescheduleModalForMatch(match);
            if (fromQuery) {
                void clearRescheduleModalDismissed(pendingRequestId);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [
        activeHold,
        holdNeedsRescheduleResponse,
        holdReschedulePending?.requestId,
        isHydratingSections,
        loadingMutuals,
        mutualDates,
        mutualNeedingReschedule,
        openRescheduleModalForMatch,
        rescheduleModalVisible,
        rescheduleRequestId,
    ]);

    const handleSectionChange = useCallback((section: Section, idx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveSection(section);
        indicatorX.value = withTiming(idx * segmentWidth.current, {
            duration: 220,
            easing: Easing.out(Easing.cubic),
        });
    }, [indicatorX]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchMutuals(), refetchHistory()]);
        setRefreshing(false);
    }, [refetchMutuals, refetchHistory]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
    }));

    const mutualBadge = sections.mutual.length > 0 ? sections.mutual.length : null;
    const arrangingBadge = sections.being_arranged.length > 0 ? sections.being_arranged.length : null;
    const upcomingBadge = sections.upcoming.length > 0 ? sections.upcoming.length : null;
    const historyBadge = history.length > 0 ? history.length : null;

    const renderContent = () => {
        if (activeSection === 'history') {
            if (loadingHistory || isHydratingSections) return <SectionSkeleton />;
            if (history.length === 0) return <EmptyDates section="history" />;
            return (
                <View style={styles.list}>
                    {history.map((date, index) => (
                        <HistoryCard key={date.id} date={date} index={index} />
                    ))}
                </View>
            );
        }

        if (loadingMutuals || isHydratingSections) return <SectionSkeleton />;

        const items = sections[activeSection];
        if (items.length === 0) {
            const needsHoldCta =
                (activeSection === 'mutual' || activeSection === 'being_arranged')
                && Boolean(
                    activeHold?.slotConfirmation?.needsSlotConfirmation
                    && !activeHold?.slotConfirmation?.viewerSlotConfirmed,
                );
            return (
                <EmptyDates
                    section={activeSection}
                    showHomeCta={needsHoldCta}
                    onGoHome={() => router.push('/(tabs)')}
                />
            );
        }

        return (
            <View style={styles.list}>
                {items.map((match, index) => (
                    <ConfirmedMatchCard key={match.id} match={match} index={index} />
                ))}
            </View>
        );
    };

    const badgeForSection = (key: Section) => {
        if (key === 'mutual') return mutualBadge;
        if (key === 'being_arranged') return arrangingBadge;
        if (key === 'upcoming') return upcomingBadge;
        return historyBadge;
    };

    return (
        <TabSwipeView route="/(tabs)/dates">
        <ScreenGradient edges={['top']} style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dates</Text>
                <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                    Mutual matches and curated plans
                </Text>
            </View>

            {showSlotConfirmBanner && activeHold ? (
                <ActionRequiredBanner
                    partnerFirstName={activeHold.partner.firstName ?? 'your match'}
                    slot={activeHold.slotConfirmation}
                    dateMatchId={activeHold.dateMatchId}
                    onPress={() => setConfirmModalVisible(true)}
                />
            ) : null}

            {showRescheduleBanner ? (
                holdNeedsRescheduleResponse && holdReschedulePending && activeHold ? (
                    <RescheduleResponseBanner
                        partnerFirstName={activeHold.partner.firstName ?? 'your match'}
                        pending={holdReschedulePending}
                        onPress={() => {
                            openRescheduleModalForMatch({
                                id: activeHold.mutualMatchId,
                                source: 'candidate_pair',
                                createdAt: activeHold.createdAt,
                                withUser: {
                                    id: activeHold.partnerUserId,
                                    firstName: activeHold.partner.firstName ?? 'your match',
                                },
                                arrangementStatus: 'being_arranged',
                                reschedule: activeHold.slotConfirmation.reschedule,
                            } as MutualDate);
                        }}
                    />
                ) : mutualNeedingReschedule?.reschedule?.pending ? (
                    <RescheduleResponseBanner
                        partnerFirstName={mutualNeedingReschedule.withUser.firstName}
                        pending={mutualNeedingReschedule.reschedule.pending}
                        onPress={() => openRescheduleModalForMatch(mutualNeedingReschedule)}
                    />
                ) : null
            ) : null}

            <View style={[styles.segmentWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)' }]}>
                <View
                    style={styles.segmentInner}
                    onLayout={(e) => {
                        segmentWidth.current = e.nativeEvent.layout.width / SECTIONS.length;
                    }}
                >
                    <Animated.View
                        style={[
                            styles.segmentIndicator,
                            { backgroundColor: colors.primary, width: `${100 / SECTIONS.length}%` },
                            indicatorStyle,
                        ]}
                    />
                    {SECTIONS.map((section, idx) => (
                        <Pressable
                            key={section.key}
                            onPress={() => handleSectionChange(section.key, idx)}
                            style={styles.segmentBtn}
                        >
                            <View style={styles.segmentLabelRow}>
                                <Text
                                    style={[
                                        styles.segmentLabel,
                                        {
                                            color: activeSection === section.key ? '#fff' : colors.mutedForeground,
                                            fontWeight: activeSection === section.key ? '700' : '500',
                                        },
                                    ]}
                                >
                                    {section.label}
                                </Text>
                                {badgeForSection(section.key) ? (
                                    <View
                                        style={[
                                            styles.badge,
                                            { backgroundColor: activeSection === section.key ? '#fff' : colors.primary },
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.badgeText,
                                                { color: activeSection === section.key ? colors.primary : '#fff' },
                                            ]}
                                        >
                                            {badgeForSection(section.key)}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </Pressable>
                    ))}
                </View>
            </View>

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={handleRefresh}
                        tintColor={colors.primary}
                        colors={[colors.primary]}
                    />
                }
            >
                <Animated.View
                    key={activeSection}
                    entering={FadeIn.duration(160).easing(Easing.out(Easing.quad))}
                >
                    {renderContent()}
                </Animated.View>
            </ScrollView>

            <DateMatchModal
                visible={matchModalVisible}
                legacyMatchId={celebrationMatch?.legacyMatchId}
                theirFirstName={celebrationMatch?.withUser.firstName ?? ''}
                theirPhoto={celebrationMatch?.withUser.profilePhoto}
                myPhoto={myProfile?.profilePhoto ?? myProfile?.photos?.[0]}
                onClose={() => {
                    setMatchModalVisible(false);
                    setCelebrationMatch(null);
                }}
            />

            {activeHold && confirmModalVisible ? (
                <MeetupSlotConfirmModal
                    visible={confirmModalVisible}
                    hold={activeHold}
                    onCancelHold={() => setConfirmModalVisible(false)}
                />
            ) : null}

            {rescheduleTarget?.reschedule?.pending ? (
                <RescheduleRespondModal
                    visible={rescheduleModalVisible}
                    mutualMatchId={rescheduleTarget.id}
                    partnerFirstName={rescheduleTarget.withUser.firstName}
                    pending={rescheduleTarget.reschedule.pending}
                    onClose={handleCloseRescheduleModal}
                />
            ) : null}
        </ScreenGradient>
        </TabSwipeView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 18,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.5,
        lineHeight: 34,
        paddingTop: 2,
    },
    headerSub: {
        fontSize: 13,
        marginTop: 4,
        lineHeight: 18,
    },
    segmentWrap: {
        marginHorizontal: 16,
        borderRadius: 14,
        padding: 4,
        marginBottom: 16,
    },
    segmentInner: {
        flexDirection: 'row',
        position: 'relative',
    },
    segmentIndicator: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        borderRadius: 10,
        zIndex: 0,
    },
    segmentBtn: {
        flex: 1,
        paddingVertical: 9,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    segmentLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    segmentLabel: {
        fontSize: 12,
    },
    badge: {
        minWidth: 16,
        height: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 3,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '700',
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
    },
    list: {
        paddingTop: 4,
    },
});
