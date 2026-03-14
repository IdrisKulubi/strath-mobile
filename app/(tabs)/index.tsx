import React, { useCallback, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    RefreshControl,
    StatusBar,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { ScreenGradient } from '@/components/ui/screen-gradient';
import { useProfile } from '@/hooks/use-profile';
import { useDailyMatches, useSkipMatch, useMarkRequestSent, DailyMatch } from '@/hooks/use-daily-matches';
import { HomeHeader } from '@/components/home/home-header';
import { DailyMatchesList } from '@/components/home/daily-matches-list';
import { EmptyMatches } from '@/components/home/empty-matches';
import { DateRequestSheet } from '@/components/date-request/date-request-sheet';
import { Skeleton } from '@/components/ui/skeleton';

function MatchesSkeleton() {
    return (
        <View style={{ gap: 16, paddingHorizontal: 16, paddingTop: 4 }}>
            {[0, 1, 2].map((i) => (
                <Skeleton key={i} style={{ height: 340, borderRadius: 20 }} />
            ))}
        </View>
    );
}

export default function HomeScreen() {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const { data: profile } = useProfile();
    const { data: matches, isLoading, refetch } = useDailyMatches();
    const { mutate: skipMatch } = useSkipMatch();
    const markRequestSent = useMarkRequestSent();

    const [refreshing, setRefreshing] = useState(false);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState<DailyMatch | null>(null);

    const handleRefresh = useCallback(async () => {
        setRefreshing(true);
        await refetch();
        setRefreshing(false);
    }, [refetch]);

    const handleAskForDate = useCallback((match: DailyMatch) => {
        setSelectedMatch(match);
        setSheetVisible(true);
    }, []);

    const handleSkip = useCallback((userId: string) => {
        skipMatch(userId);
    }, [skipMatch]);

    const handleSheetClose = useCallback(() => {
        setSheetVisible(false);
        setSelectedMatch(null);
    }, []);

    const handleRequestSuccess = useCallback(() => {
        if (selectedMatch) {
            markRequestSent(selectedMatch.userId);
        }
        setSheetVisible(false);
        setSelectedMatch(null);
    }, [selectedMatch, markRequestSent]);

    const visibleMatches = matches ?? [];

    return (
        <ScreenGradient edges={['top']} style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

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
                <HomeHeader firstName={profile?.firstName} matchCount={visibleMatches.length} />
                {isLoading ? (
                    <MatchesSkeleton />
                ) : visibleMatches.length === 0 ? (
                    <EmptyMatches />
                ) : (
                    <DailyMatchesList
                        matches={visibleMatches}
                        onAskForDate={handleAskForDate}
                        onSkip={handleSkip}
                    />
                )}
            </ScrollView>

            {selectedMatch && (
                <DateRequestSheet
                    visible={sheetVisible}
                    toUserId={selectedMatch.userId}
                    toUserName={selectedMatch.firstName}
                    onClose={handleSheetClose}
                    onSuccess={handleRequestSuccess}
                />
            )}
        </ScreenGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 32,
    },
});
