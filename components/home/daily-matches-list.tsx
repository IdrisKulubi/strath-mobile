import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DailyMatch } from '@/hooks/use-daily-matches';
import { MatchCard } from './match-card';
import { EmptyMatches } from './empty-matches';

interface DailyMatchesListProps {
    matches: DailyMatch[];
    onAskForDate: (match: DailyMatch) => void;
    onSkip: (userId: string) => void;
}

export function DailyMatchesList({ matches, onAskForDate, onSkip }: DailyMatchesListProps) {
    if (matches.length === 0) {
        return <EmptyMatches />;
    }

    return (
        <View style={styles.container}>
            {matches.map((match, index) => (
                <MatchCard
                    key={match.userId}
                    match={match}
                    index={index}
                    onAskForDate={onAskForDate}
                    onSkip={onSkip}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingBottom: 24,
    },
});
