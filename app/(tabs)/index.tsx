import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { useTheme } from '@/hooks/use-theme';
import { useProfile } from '@/hooks/use-profile';
import {
    DailyMatch,
    useDailyMatches,
    useRespondToDailyPair,
} from '@/hooks/use-daily-matches';
import { HomeHeader } from '@/components/home/home-header';
import { DailyMatchesList } from '@/components/home/daily-matches-list';
import { EmptyMatches } from '@/components/home/empty-matches';

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
    const toast = useToast();
    const isDark = colorScheme === 'dark';

    const { data: profile } = useProfile();
    const {
        data: matches = [],
        isLoading,
        isRefetching,
        refetch,
    } = useDailyMatches();
    const respondToPair = useRespondToDailyPair();
    const [refreshing, setRefreshing] = useState(false);
    const [hasSeenMatchesToday, setHasSeenMatchesToday] = useState(false);

    useEffect(() => {
        if (matches.length > 0) {
            setHasSeenMatchesToday(true);
        }
    }, [matches.length]);

    const allActioned = hasSeenMatchesToday && matches.length === 0 && !isLoading && !isRefetching;

    const activeMatchCount = useMemo(
        () => matches.filter((match) => match.currentUserDecision === 'pending').length,
        [matches]
    );

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        try {
            await refetch();
        } finally {
            setRefreshing(false);
        }
    }, [refetch]);

    const handleOpenToMeet = useCallback((match: DailyMatch) => {
        respondToPair.mutate(
            { pairId: match.pairId, decision: 'open_to_meet' },
            {
                onSuccess: () => {
                    toast.show({
                        message: `You are open to meeting ${match.firstName}. We'll only reveal it if they say yes too.`,
                        variant: 'success',
                        position: 'bottom',
                    });
                },
                onError: () => {
                    toast.show({
                        message: 'Could not save your decision right now. Please try again.',
                        variant: 'danger',
                    });
                },
            }
        );
    }, [respondToPair, toast]);

    const handlePass = useCallback((match: DailyMatch) => {
        respondToPair.mutate({ pairId: match.pairId, decision: 'passed' }, {
            onSuccess: () => {
                toast.show({
                    message: `${match.firstName} will be removed from this daily set.`,
                    variant: 'default',
                    position: 'bottom',
                });
            },
            onError: () => {
                toast.show({
                    message: 'Could not pass on this pair right now. Please try again.',
                    variant: 'danger',
                });
            },
        });
    }, [respondToPair, toast]);

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
                showsVerticalScrollIndicator={false}
            >
                <HomeHeader
                    firstName={profile?.firstName}
                    matchCount={matches.length}
                />

                {isLoading ? (
                    <HomeSkeleton />
                ) : matches.length > 0 ? (
                    <DailyMatchesList
                        matches={matches}
                        onOpenToMeet={handleOpenToMeet}
                        onPass={handlePass}
                    />
                ) : (
                    <EmptyMatches allActioned={allActioned} />
                )}

                {!isLoading && matches.length > 0 && activeMatchCount === 0 ? (
                    <View style={[styles.allSentBanner, { backgroundColor: isDark ? colors.card : '#f5f5f5', borderColor: colors.border }]}>
                        <Text style={[styles.allSentTitle, { color: colors.foreground }]}>
                            Decisions locked in
                        </Text>
                        <Text style={[styles.allSentSubtitle, { color: colors.mutedForeground }]}>
                            Check the Dates tab for mutuals and confirmed plans.
                        </Text>
                    </View>
                ) : null}
            </ScrollView>
        </SafeAreaView>
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
