import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { DailyMatch } from '@/hooks/use-daily-matches';
import { FocusMatchCarousel } from '@/components/home/focus-match-carousel';
import { HomeIntroCard, HomeIntroCardData } from '@/components/home/home-intro-card';

interface DailyMatchesListProps {
    matches: DailyMatch[];
    onOpenToMeet: (match: DailyMatch) => void;
    onPass: (match: DailyMatch) => void;
    onViewProfile?: (match: DailyMatch) => void;
    actionsDisabled?: boolean;
    onFocusedIndexChange?: (index: number) => void;
    cardHeight: number;
    itemWidthRatio?: number;
}

function buildIdentityLine(match: DailyMatch) {
    const parts = [match.course, match.university].filter(Boolean);
    if (parts.length === 0) return 'Curated for you today';
    return parts.join(' · ');
}

function toIntroCardData(match: DailyMatch): HomeIntroCardData {
    const reason = match.reasons?.[0] ?? 'A strong fit based on your profile and preferences.';
    return {
        id: match.pairId,
        photo: match.profilePhoto,
        firstName: match.firstName,
        age: match.age,
        identityLine: buildIdentityLine(match),
        reason,
        decision: match.currentUserDecision,
    };
}

/** Expects a non-empty list; Home renders `EmptyMatches` when there are no matches. */
export function DailyMatchesList({
    matches,
    onOpenToMeet,
    onPass,
    onViewProfile,
    actionsDisabled = false,
    onFocusedIndexChange,
    cardHeight,
    itemWidthRatio,
}: DailyMatchesListProps) {
    const cardDataList = useMemo(() => matches.map(toIntroCardData), [matches]);
    const matchByPairId = useMemo(
        () => new Map(matches.map((match) => [match.pairId, match])),
        [matches],
    );

    const renderCard = useCallback(
        (data: HomeIntroCardData) => {
            const match = matchByPairId.get(data.id);
            if (!match) return null;

            return (
                <HomeIntroCard
                    data={data}
                    height={cardHeight}
                    actionsDisabled={actionsDisabled}
                    onPhotoPress={() => {
                        if (onViewProfile) {
                            onViewProfile(match);
                            return;
                        }
                    }}
                    onInterested={() => onOpenToMeet(match)}
                    onPass={() => onPass(match)}
                />
            );
        },
        [actionsDisabled, cardHeight, matchByPairId, onOpenToMeet, onPass, onViewProfile],
    );

    if (matches.length === 0) {
        return null;
    }

    return (
        <View style={styles.container}>
            <FocusMatchCarousel
                items={cardDataList}
                keyExtractor={(item) => item.id}
                renderItem={(item) => renderCard(item)}
                onIndexChange={onFocusedIndexChange}
                cardHeight={cardHeight}
                itemWidthRatio={itemWidthRatio}
                showFraction={false}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});
