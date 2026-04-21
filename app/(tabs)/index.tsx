import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import { isVerificationRequiredError } from '@/lib/api-errors';
import {
    DailyMatch,
    useDailyMatches,
    useRespondToDailyPair,
} from '@/hooks/use-daily-matches';
import { HomeHeader } from '@/components/home/home-header';
import { DailyMatchesList } from '@/components/home/daily-matches-list';
import { EmptyMatches } from '@/components/home/empty-matches';
import { DateHoldCard } from '@/components/home/date-hold-card';
import { useToast } from '@/components/ui/toast';
import { DecisionInfoSheet, type DecisionSheetType } from '@/components/home/decision-info-sheet';
import { PendingDecisionBar } from '@/components/home/pending-decision-bar';
import { TabSwipeView } from '@/components/navigation/tab-swipe-view';

const UNDO_WINDOW_MS = 5000;

interface PendingHomeDecision {
    pairId: string;
    decision: 'open_to_meet' | 'passed';
    firstName: string;
    expiresAt: number;
    status: 'undoable' | 'committing';
}

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

export default function HomeScreen() {
    const { colors, colorScheme } = useTheme();
    const router = useRouter();
    const toast = useToast();
    const isDark = colorScheme === 'dark';

    const [infoSheet, setInfoSheet] = useState<{
        visible: boolean;
        type: DecisionSheetType;
        firstName?: string;
        match?: DailyMatch;
    }>({ visible: false, type: 'open_to_meet' });

    const { data: profile } = useProfile();
    const {
        data: matchesData,
        isLoading,
        isRefetching,
        error,
        refetch,
        verificationRequired,
    } = useDailyMatches();
    const matches = useMemo(() => matchesData?.matches ?? [], [matchesData]);
    const hasUpcomingQueued = matchesData?.hasUpcomingQueued ?? false;
    const hold = matchesData?.mode === 'hold' ? matchesData.hold ?? null : null;
    const respondToPair = useRespondToDailyPair();
    const [refreshing, setRefreshing] = useState(false);
    const [hasSeenMatchesToday, setHasSeenMatchesToday] = useState(false);
    const [pendingDecision, setPendingDecision] = useState<PendingHomeDecision | null>(null);
    const pendingCommitTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        if (matches.length > 0) {
            setHasSeenMatchesToday(true);
        }
    }, [matches.length]);

    useEffect(() => {
        if (verificationRequired || isVerificationRequiredError(error)) {
            router.replace('/verification');
        }
    }, [error, router, verificationRequired]);

    const displayedMatches = useMemo(() => {
        if (!pendingDecision) {
            return matches;
        }

        return matches.flatMap((match) => {
            if (match.pairId !== pendingDecision.pairId) {
                return [match];
            }

            if (pendingDecision.decision === 'passed') {
                return [];
            }

            return [{ ...match, currentUserDecision: 'open_to_meet' as const }];
        });
    }, [matches, pendingDecision]);

    const allActioned = !pendingDecision && hasSeenMatchesToday && displayedMatches.length === 0 && !isLoading && !isRefetching;

    const activeMatchCount = useMemo(
        () => displayedMatches.filter((match) => match.currentUserDecision === 'pending').length,
        [displayedMatches]
    );

    const clearPendingCommitTimeout = useCallback(() => {
        if (pendingCommitTimeoutRef.current) {
            clearTimeout(pendingCommitTimeoutRef.current);
            pendingCommitTimeoutRef.current = null;
        }
    }, []);

    const finalizeDecision = useCallback(async (decisionState: PendingHomeDecision) => {
        setPendingDecision((current) => (
            current?.pairId === decisionState.pairId
                ? { ...current, status: 'committing' }
                : current
        ));

        try {
            await respondToPair.mutateAsync({
                pairId: decisionState.pairId,
                decision: decisionState.decision,
            });

            setPendingDecision((current) => (
                current?.pairId === decisionState.pairId ? null : current
            ));

            if (decisionState.decision === 'open_to_meet') {
                setInfoSheet({
                    visible: true,
                    type: 'open_to_meet',
                    firstName: decisionState.firstName,
                });
            } else {
                setInfoSheet({
                    visible: true,
                    type: 'pass',
                    firstName: decisionState.firstName,
                });
            }
        } catch (err) {
            setPendingDecision((current) => (
                current?.pairId === decisionState.pairId ? null : current
            ));

            if (
                decisionState.decision === 'open_to_meet'
                && err?.message?.includes('You have already responded to this pair')
            ) {
                setInfoSheet({
                    visible: true,
                    type: 'already_responded',
                    firstName: decisionState.firstName,
                });
                return;
            }

            toast.show({
                message: decisionState.decision === 'open_to_meet'
                    ? 'Could not save your decision right now. Please try again.'
                    : 'Could not pass on this pair right now. Please try again.',
                variant: 'danger',
            });
        }
    }, [respondToPair, toast]);

    useEffect(() => {
        if (!pendingDecision || pendingDecision.status !== 'undoable') {
            clearPendingCommitTimeout();
            return;
        }

        const remainingMs = Math.max(0, pendingDecision.expiresAt - Date.now());
        pendingCommitTimeoutRef.current = setTimeout(() => {
            void finalizeDecision(pendingDecision);
        }, remainingMs);

        return () => {
            clearPendingCommitTimeout();
        };
    }, [clearPendingCommitTimeout, finalizeDecision, pendingDecision]);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    const queueDecision = useCallback((match: DailyMatch, decision: PendingHomeDecision['decision']) => {
        if (pendingDecision) {
            toast.show({
                message: 'Undo or wait a moment before choosing another profile.',
                variant: 'warning',
            });
            return;
        }

        setPendingDecision({
            pairId: match.pairId,
            decision,
            firstName: match.firstName,
            expiresAt: Date.now() + UNDO_WINDOW_MS,
            status: 'undoable',
        });
    }, [pendingDecision, toast]);

    const handleOpenToMeet = useCallback((match: DailyMatch) => {
        queueDecision(match, 'open_to_meet');
    }, [queueDecision]);

    const handlePass = useCallback((match: DailyMatch) => {
        queueDecision(match, 'passed');
    }, [queueDecision]);

    const handleUndoPendingDecision = useCallback(() => {
        clearPendingCommitTimeout();
        setPendingDecision(null);
    }, [clearPendingCommitTimeout]);

    useEffect(() => {
        return () => {
            clearPendingCommitTimeout();
        };
    }, [clearPendingCommitTimeout]);

    return (
        <TabSwipeView route="/(tabs)">
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                    styles.content,
                    pendingDecision?.status === 'undoable' && styles.contentWithUndo,
                ]}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <HomeHeader
                    firstName={profile?.firstName}
                    matchCount={displayedMatches.length}
                />

                {isLoading ? (
                    <HomeSkeleton />
                ) : hold ? (
                    <DateHoldCard hold={hold} />
                ) : displayedMatches.length > 0 ? (
                    <DailyMatchesList
                        matches={displayedMatches}
                        onOpenToMeet={handleOpenToMeet}
                        onPass={handlePass}
                        actionsDisabled={!!pendingDecision}
                        onViewProfile={(match) => {
                            setInfoSheet({ visible: true, type: 'view_profile', firstName: match.firstName, match });
                        }}
                    />
                ) : (
                    <EmptyMatches allActioned={allActioned} hasUpcomingQueued={hasUpcomingQueued} />
                )}

                {!pendingDecision && !isLoading && displayedMatches.length > 0 && activeMatchCount === 0 ? (
                    <View style={[styles.allSentBanner, { backgroundColor: isDark ? colors.card : '#f5f5f5', borderColor: colors.border }]}>
                        <Text style={[styles.allSentTitle, { color: colors.foreground }]}>
                            Decisions locked in 😉 
                        </Text>
                        <Text style={[styles.allSentSubtitle, { color: colors.mutedForeground }]}>
                            Head to Dates when you&apos;re both a match — that&apos;s where the magic happens 💫
                        </Text>
                    </View>
                ) : null}
            </ScrollView>

            {pendingDecision?.status === 'undoable' ? (
                <PendingDecisionBar
                    decision={pendingDecision.decision}
                    firstName={pendingDecision.firstName}
                    expiresAt={pendingDecision.expiresAt}
                    onUndo={handleUndoPendingDecision}
                />
            ) : null}

            <DecisionInfoSheet
                visible={infoSheet.visible}
                type={infoSheet.type}
                firstName={infoSheet.firstName}
                onClose={() => {
                    const match = infoSheet.match;
                    setInfoSheet((s) => ({ ...s, visible: false, match: undefined }));
                    if (match && infoSheet.type === 'view_profile') {
                        router.push({ pathname: '/profile/[userId]', params: { userId: match.userId, pairId: match.pairId } });
                    }
                }}
            />
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
        paddingBottom: 28,
    },
    contentWithUndo: {
        paddingBottom: 144,
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
        height: 520,
        borderRadius: 28,
    },
    allSentBanner: {
        marginHorizontal: 16,
        marginTop: 4,
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 16,
        gap: 4,
    },
    allSentTitle: {
        fontSize: 16,
        fontWeight: '700',
    },
    allSentSubtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
});
