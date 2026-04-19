import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, StatusBar, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenGradient } from '@/components/ui/screen-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useMutualMatches, useDateHistory } from '@/hooks/use-date-requests';
import { ConfirmedMatchCard } from '@/components/dates/confirmed-match-card';
import { DecisionPendingCard } from '@/components/dates/decision-pending-card';
import { FinishDecisionModal } from '@/components/dates/finish-decision-modal';
import { HistoryCard } from '@/components/dates/history-card';
import { EmptyDates } from '@/components/dates/empty-dates';
import { Skeleton } from '@/components/ui/skeleton';
import { DateMatchModal } from '@/components/date-match/date-match-modal';
import { useProfile } from '@/hooks/use-profile';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';
import type { MutualDate } from '@/hooks/use-date-requests';

type Section = 'mutual' | 'call_pending' | 'being_arranged' | 'upcoming' | 'history';

const SECTIONS: { key: Section; label: string }[] = [
    { key: 'mutual', label: 'Mutual' },
    { key: 'call_pending', label: 'Call' },
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
    const [decisionMatch, setDecisionMatch] = useState<MutualDate | null>(null);
    const seenMatchIds = useRef<Set<string>>(new Set());

    const sections = useMemo(() => ({
        mutual: mutualDates.filter((item) => item.arrangementStatus === 'mutual'),
        call_pending: mutualDates.filter((item) => item.arrangementStatus === 'call_pending'),
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
        setTimeout(() => setMatchModalVisible(true), 400);
    }, [fetchingMutuals, isHydratingSections, sections.mutual]);

    const handleSectionChange = useCallback((section: Section, idx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveSection(section);
        indicatorX.value = withSpring(idx * segmentWidth.current, { damping: 18, stiffness: 220 });
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
    const callBadge = sections.call_pending.length > 0 ? sections.call_pending.length : null;
    const arrangingBadge = sections.being_arranged.length > 0 ? sections.being_arranged.length : null;
    const upcomingBadge = sections.upcoming.length > 0 ? sections.upcoming.length : null;
    const historyBadge = history.length > 0 ? history.length : null;
    const celebratedMatch = sections.mutual[0];

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
            return <EmptyDates section={activeSection} />;
        }

        if (activeSection === 'call_pending') {
            return (
                <View style={styles.list}>
                    {items.map((match, index) => {
                        const stage = match.callStage;
                        const isDecisionPending =
                            stage === 'decision_pending_me'
                            || stage === 'decision_pending_partner'
                            || stage === 'decision_pending_both';

                        if (isDecisionPending) {
                            return (
                                <DecisionPendingCard
                                    key={match.id}
                                    match={match}
                                    index={index}
                                    onPress={(m) => setDecisionMatch(m)}
                                />
                            );
                        }
                        return <ConfirmedMatchCard key={match.id} match={match} index={index} />;
                    })}
                </View>
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
                                {(
                                    (section.key === 'mutual' && mutualBadge)
                                    || (section.key === 'call_pending' && callBadge)
                                    || (section.key === 'being_arranged' && arrangingBadge)
                                    || (section.key === 'upcoming' && upcomingBadge)
                                    || (section.key === 'history' && historyBadge)
                                ) ? (
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
                                            {section.key === 'mutual'
                                                ? mutualBadge
                                                : section.key === 'call_pending'
                                                    ? callBadge
                                                    : section.key === 'being_arranged'
                                                        ? arrangingBadge
                                                        : section.key === 'upcoming'
                                                            ? upcomingBadge
                                                            : historyBadge}
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
                {renderContent()}
            </ScrollView>

            <DateMatchModal
                visible={matchModalVisible}
                matchId={celebratedMatch?.id}
                callMatchId={celebratedMatch?.legacyMatchId}
                theirFirstName={celebratedMatch?.withUser.firstName ?? ''}
                theirPhoto={celebratedMatch?.withUser.profilePhoto}
                myPhoto={myProfile?.profilePhoto ?? myProfile?.photos?.[0]}
                compatibilityScore={celebratedMatch?.withUser.compatibilityScore}
                onClose={() => setMatchModalVisible(false)}
            />

            <FinishDecisionModal
                visible={!!decisionMatch}
                mutualDate={decisionMatch}
                onClose={() => setDecisionMatch(null)}
            />
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
