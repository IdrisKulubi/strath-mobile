import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DailyMatch } from '@/hooks/use-daily-matches';
import { MatchCard } from './match-card';
import { EmptyMatches } from './empty-matches';

interface DailyMatchesListProps {
    matches: DailyMatch[];
    onOpenToMeet: (match: DailyMatch) => void;
    onPass: (match: DailyMatch) => void;
    onViewProfile?: (match: DailyMatch) => void;
}

export function DailyMatchesList({ matches, onOpenToMeet, onPass, onViewProfile }: DailyMatchesListProps) {
    if (matches.length === 0) {
        return <EmptyMatches />;
    }

    return (
        <View style={styles.container}>
            {matches.map((match, index) => (
                <MatchCard
                    key={match.pairId}
                    match={match}
                    index={index}
                    onOpenToMeet={onOpenToMeet}
                    onPass={onPass}
                    onViewProfile={onViewProfile}
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
