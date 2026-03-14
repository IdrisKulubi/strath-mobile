import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    StatusBar,
    Pressable,
} from 'react-native';
import { ScreenGradient } from '@/components/ui/screen-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import {
    useIncomingDateRequests,
    useSentDateRequests,
    useConfirmedMatches,
    useDateHistory,
    useRespondToDateRequest,
} from '@/hooks/use-date-requests';
import { IncomingRequestCard } from '@/components/dates/incoming-request-card';
import { SentInviteCard } from '@/components/dates/sent-invite-card';
import { ConfirmedMatchCard } from '@/components/dates/confirmed-match-card';
import { HistoryCard } from '@/components/dates/history-card';
import { EmptyDates } from '@/components/dates/empty-dates';
import { Skeleton } from '@/components/ui/skeleton';
import { DateMatchModal } from '@/components/date-match/date-match-modal';
import { useProfile } from '@/hooks/use-profile';

type Section = 'incoming' | 'sent' | 'confirmed' | 'history';

const SECTIONS: { key: Section; label: string }[] = [
    { key: 'incoming', label: 'Incoming' },
    { key: 'sent', label: 'Sent' },
    { key: 'confirmed', label: 'Confirmed' },
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
    const [activeSection, setActiveSection] = useState<Section>('incoming');
    const [refreshing, setRefreshing] = useState(false);

    const indicatorX = useSharedValue(0);
    const segmentWidth = useRef(0);

    const { data: myProfile } = useProfile();
    const { data: incoming, isLoading: loadingIncoming, refetch: refetchIncoming } = useIncomingDateRequests();
    const { data: sent, isLoading: loadingSent, refetch: refetchSent } = useSentDateRequests();
    const { data: confirmed, isLoading: loadingConfirmed, refetch: refetchConfirmed } = useConfirmedMatches();
    const { data: history, isLoading: loadingHistory, refetch: refetchHistory } = useDateHistory();
    const { mutate: respond, isPending: isResponding } = useRespondToDateRequest();

    // Match modal — fires once when a new confirmed match is detected
    const [matchModalVisible, setMatchModalVisible] = useState(false);
    const seenMatchIds = useRef<Set<string>>(new Set());

    useEffect(() => {
        if (!confirmed || confirmed.length === 0) return;
        // Find the first unseen call_pending match to celebrate
        const newMatch = confirmed.find(
            (m) => m.arrangementStatus === 'call_pending' && !seenMatchIds.current.has(m.id)
        );
        if (newMatch) {
            seenMatchIds.current.add(newMatch.id);
            // Small delay so the tab content renders first
            setTimeout(() => setMatchModalVisible(true), 400);
        }
    }, [confirmed]);

    const handleSectionChange = useCallback((section: Section, idx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveSection(section);
        indicatorX.value = withSpring(idx * segmentWidth.current, { damping: 18, stiffness: 220 });
    }, [indicatorX]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([refetchIncoming(), refetchSent(), refetchConfirmed(), refetchHistory()]);
        setRefreshing(false);
    }, [refetchIncoming, refetchSent, refetchConfirmed, refetchHistory]);

    const handleAccept = useCallback((requestId: string) => {
        respond({ requestId, action: 'accept' });
    }, [respond]);

    const handleDecline = useCallback((requestId: string) => {
        respond({ requestId, action: 'decline' });
    }, [respond]);

    const indicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: indicatorX.value }],
    }));

    const incomingBadge = (incoming?.length ?? 0) > 0 ? incoming!.length : null;

    const renderContent = () => {
        if (activeSection === 'incoming') {
            if (loadingIncoming) return <SectionSkeleton />;
            if (!incoming || incoming.length === 0) {
                return <EmptyDates section="requests" />;
            }
            return (
                <View style={styles.list}>
                    {/* Show only the first (most recent) incoming invite */}
                    <IncomingRequestCard
                        request={incoming[0]}
                        index={0}
                        onAccept={handleAccept}
                        onDecline={handleDecline}
                        isResponding={isResponding}
                    />
                    {incoming.length > 1 && (
                        <View style={[styles.queueHint, { backgroundColor: isDark ? colors.muted : '#f5f5f5' }]}>
                            <Text style={[styles.queueHintText, { color: colors.mutedForeground }]}>
                                +{incoming.length - 1} more invite{incoming.length - 1 > 1 ? 's' : ''} waiting
                            </Text>
                        </View>
                    )}
                </View>
            );
        }

        if (activeSection === 'sent') {
            if (loadingSent) return <SectionSkeleton />;
            if (!sent || sent.length === 0) {
                return <EmptyDates section="sent" />;
            }
            return (
                <View style={styles.list}>
                    {sent.map((req, i) => (
                        <SentInviteCard key={req.id} request={req} index={i} />
                    ))}
                </View>
            );
        }

        if (activeSection === 'confirmed') {
            if (loadingConfirmed) return <SectionSkeleton />;
            if (!confirmed || confirmed.length === 0) {
                return <EmptyDates section="confirmed" />;
            }
            return (
                <View style={styles.list}>
                    {confirmed.map((match, i) => (
                        <ConfirmedMatchCard key={match.id} match={match} index={i} />
                    ))}
                </View>
            );
        }

        // history
        if (loadingHistory) return <SectionSkeleton />;
        if (!history || history.length === 0) {
            return <EmptyDates section="history" />;
        }
        return (
            <View style={styles.list}>
                {history.map((date, i) => (
                    <HistoryCard key={date.id} date={date} index={i} />
                ))}
            </View>
        );
    };

    return (
        <ScreenGradient edges={['top']} style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Dates</Text>
                <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                    Your real-world connections
                </Text>
            </View>

            {/* Segmented control — 4 sections */}
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
                    {SECTIONS.map((s, idx) => (
                        <Pressable
                            key={s.key}
                            onPress={() => handleSectionChange(s.key, idx)}
                            style={styles.segmentBtn}
                        >
                            <View style={styles.segmentLabelRow}>
                                <Text
                                    style={[
                                        styles.segmentLabel,
                                        {
                                            color: activeSection === s.key ? '#fff' : colors.mutedForeground,
                                            fontWeight: activeSection === s.key ? '700' : '500',
                                        },
                                    ]}
                                >
                                    {s.label}
                                </Text>
                                {s.key === 'incoming' && incomingBadge ? (
                                    <View style={[
                                        styles.badge,
                                        { backgroundColor: activeSection === 'incoming' ? '#fff' : colors.primary },
                                    ]}>
                                        <Text style={[
                                            styles.badgeText,
                                            { color: activeSection === 'incoming' ? colors.primary : '#fff' },
                                        ]}>
                                            {incomingBadge}
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                        </Pressable>
                    ))}
                </View>
            </View>

            {/* Content */}
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

            {/* Match celebration modal */}
            {(() => {
                const celebMatch = confirmed?.find(
                    (m) => m.arrangementStatus === 'call_pending' && seenMatchIds.current.has(m.id)
                );
                return (
                    <DateMatchModal
                        visible={matchModalVisible}
                        matchId={celebMatch?.id}
                        callMatchId={celebMatch?.callMatchId}
                        theirFirstName={celebMatch?.withUser.firstName ?? ''}
                        theirPhoto={celebMatch?.withUser.profilePhoto}
                        myPhoto={myProfile?.profilePhoto ?? myProfile?.photos?.[0]}
                        compatibilityScore={celebMatch?.withUser.compatibilityScore}
                        onClose={() => setMatchModalVisible(false)}
                    />
                );
            })()}
        </ScreenGradient>
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
    queueHint: {
        marginHorizontal: 16,
        marginTop: 4,
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        alignItems: 'center',
    },
    queueHintText: {
        fontSize: 13,
        fontWeight: '500',
    },
});
