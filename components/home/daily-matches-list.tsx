import React from 'react';
import { View, StyleSheet } from 'react-native';
import { DailyMatch } from '@/hooks/use-daily-matches';
import { MatchCard } from './match-card';

interface DailyMatchesListProps {
    matches: DailyMatch[];
    onOpenToMeet: (match: DailyMatch) => void;
    onPass: (match: DailyMatch) => void;
    onViewProfile?: (match: DailyMatch) => void;
    actionsDisabled?: boolean;
}

/** Expects a non-empty list; Home renders `EmptyMatches` when there are no matches. */
export function DailyMatchesList({
    matches,
    onOpenToMeet,
    onPass,
    onViewProfile,
    actionsDisabled = false,
}: DailyMatchesListProps) {
    if (matches.length === 0) {
        return null;
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
                    actionsDisabled={actionsDisabled}
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
