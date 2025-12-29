import React, { useCallback, useState } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useMatches, Match } from '@/hooks/use-matches';
import { MatchesList } from '@/components/matches/matches-list';
import * as Haptics from 'expo-haptics';

export default function MatchesScreen() {
    const { colors, colorScheme } = useTheme();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data, isLoading, isError, refetch } = useMatches();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const matches = data?.matches ?? [];

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const handleMatchPress = useCallback((match: Match) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } } as any);
    }, [router]);

    const handleExplore = useCallback(() => {
        router.push('/(tabs)');
    }, [router]);

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top']}
        >
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <Text className="text-foreground text-[28px] font-bold">
                    Matches
                </Text>
                {matches.length > 0 && (
                    <Text className="text-muted-foreground text-[15px]">
                        {matches.length} {matches.length === 1 ? 'connection' : 'connections'}
                    </Text>
                )}
            </View>

            {/* Matches List */}
            <View style={styles.listContainer}>
                <MatchesList
                    matches={matches}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    onMatchPress={handleMatchPress}
                />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },
    listContainer: {
        flex: 1,
    },
});
