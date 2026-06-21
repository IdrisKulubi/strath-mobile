import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeOut, Easing, LinearTransition, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { Text } from '@/components/ui/text';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/toast';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import {
    ConnectionRequest,
    useConnectionRequests,
    useRespondToConnectionRequest,
} from '@/hooks/use-connection-requests';
import { FocusMatchCarousel } from '@/components/home/focus-match-carousel';
import { HomeIntroCard, HomeIntroCardData } from '@/components/home/home-intro-card';
import {
    getIncomingLikeFirstName,
    getIncomingLikeMeta,
    getIncomingLikePhoto,
    getIncomingLikeTimeAgo,
} from '@/lib/incoming-like-utils';

interface InterestedInYouSectionProps {
    cardHeight: number;
    itemWidthRatio?: number;
    onFocusedIndexChange?: (index: number) => void;
    onSwitchToToday?: () => void;
}

function toIntroCardData(request: ConnectionRequest): HomeIntroCardData {
    const firstName = getIncomingLikeFirstName(request.fromUser.name);
    const timeAgo = getIncomingLikeTimeAgo(request.createdAt);
    const reasonSuffix = timeAgo ? ` Chose you ${timeAgo}.` : ' Chose you recently.';
    return {
        id: request.requestId,
        photo: getIncomingLikePhoto(request),
        firstName,
        identityLine: getIncomingLikeMeta(request),
        reason: `They picked you on StrathSpace.${reasonSuffix} Review their profile and respond when you are ready.`,
    };
}

function InterestedSkeleton() {
    return (
        <View style={styles.skeletonWrap}>
            <Skeleton style={styles.sectionTitleSkeleton} />
            <Skeleton style={styles.cardSkeleton} />
        </View>
    );
}

export function InterestedInYouSection({
    cardHeight,
    itemWidthRatio,
    onFocusedIndexChange,
    onSwitchToToday,
}: InterestedInYouSectionProps) {
    const { colors } = useTheme();
    const router = useRouter();
    const toast = useToast();
    const { data: requests = [], isLoading, isError, refetch } = useConnectionRequests();
    const respondMutation = useRespondToConnectionRequest();
    const [removedIds, setRemovedIds] = useState<Set<string>>(new Set());
    const reducedMotion = useReducedMotion();

    const visibleRequests = useMemo(
        () => requests.filter((request) => !removedIds.has(request.requestId)),
        [removedIds, requests],
    );

    const cardDataList = useMemo(
        () => visibleRequests.map(toIntroCardData),
        [visibleRequests],
    );

    const requestById = useMemo(
        () => new Map(visibleRequests.map((request) => [request.requestId, request])),
        [visibleRequests],
    );

    const handleViewProfile = useCallback(
        (request: ConnectionRequest) => {
            router.push({
                pathname: '/profile/[userId]',
                params: { userId: request.fromUser.id },
            });
        },
        [router],
    );

    const handleRespond = useCallback(
        async (request: ConnectionRequest, action: 'like' | 'pass') => {
            const firstName = getIncomingLikeFirstName(request.fromUser.name);
            try {
                Haptics.impactAsync(
                    action === 'like'
                        ? Haptics.ImpactFeedbackStyle.Medium
                        : Haptics.ImpactFeedbackStyle.Light,
                );
                const result = await respondMutation.mutateAsync({
                    targetUserId: request.fromUser.id,
                    action,
                });

                setRemovedIds((current) => {
                    const next = new Set(current);
                    next.add(request.requestId);
                    return next;
                });

                if (action === 'like' && result?.isMatch) {
                    toast.show({
                        message: `It's mutual with ${firstName}. Check Dates.`,
                        variant: 'success',
                        position: 'top',
                        duration: 3600,
                    });
                    const matchId = result?.match?.id;
                    if (matchId) {
                        router.push({
                            pathname: '/chat/[matchId]',
                            params: { matchId },
                        } as never);
                    }
                    return;
                }

                toast.show({
                    message:
                        action === 'like'
                            ? `Interest saved for ${firstName}.`
                            : `${firstName} passed.`,
                    variant: action === 'like' ? 'success' : 'default',
                    position: 'top',
                    size: 'medium',
                });
            } catch {
                toast.show({
                    message: 'Could not save that response right now. Please try again.',
                    variant: 'danger',
                });
            }
        },
        [respondMutation, router, toast],
    );

    const renderCard = useCallback(
        (data: HomeIntroCardData) => {
            const request = requestById.get(data.id);
            if (!request) return null;

            return (
                <Animated.View
                    exiting={
                        reducedMotion
                            ? undefined
                            : FadeOut.duration(180).easing(Easing.out(Easing.quad))
                    }
                    layout={reducedMotion ? undefined : LinearTransition.duration(180)}
                >
                    <HomeIntroCard
                        data={data}
                        height={cardHeight}
                        actionsDisabled={respondMutation.isPending}
                        onPhotoPress={() => handleViewProfile(request)}
                        onInterested={() => handleRespond(request, 'like')}
                        onPass={() => handleRespond(request, 'pass')}
                    />
                </Animated.View>
            );
        },
        [cardHeight, handleRespond, handleViewProfile, reducedMotion, requestById, respondMutation.isPending],
    );

    if (isLoading) {
        return <InterestedSkeleton />;
    }

    if (isError) {
        return (
            <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    Could not load incoming interest
                </Text>
                <Text variant="muted" style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    Check your connection and try again.
                </Text>
                <Pressable
                    onPress={() => refetch()}
                    style={({ pressed }) => [
                        styles.retryBtn,
                        { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel="Retry loading interested people"
                >
                    <Text style={{ color: colors.primary, ...TYPOGRAPHY.callout, fontWeight: '600' }}>
                        Retry
                    </Text>
                </Pressable>
            </View>
        );
    }

    if (visibleRequests.length === 0) {
        return (
            <View style={styles.emptyWrap}>
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                    No one has chosen you yet
                </Text>
                <Text variant="muted" style={[styles.emptySubtitle, { color: colors.mutedForeground }]}>
                    Today's picks are where new intros start. Keep your profile active so people can find you.
                </Text>
                {onSwitchToToday ? (
                    <Pressable
                        onPress={onSwitchToToday}
                        style={({ pressed }) => [
                            styles.retryBtn,
                            { borderColor: colors.border, opacity: pressed ? 0.85 : 1 },
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel="Go to today's picks"
                    >
                        <Text style={{ color: colors.primary, ...TYPOGRAPHY.callout, fontWeight: '600' }}>
                            View today's picks
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        );
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
    emptyWrap: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.section,
        gap: SPACING.compact,
        alignItems: 'flex-start',
    },
    emptyTitle: {
        ...TYPOGRAPHY.headline,
    },
    emptySubtitle: {
        ...TYPOGRAPHY.body,
        maxWidth: 320,
    },
    retryBtn: {
        minHeight: 44,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.tight,
        borderRadius: 12,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.tight,
    },
    skeletonWrap: {
        paddingHorizontal: SPACING.screenX,
        gap: SPACING.compact,
    },
    sectionTitleSkeleton: {
        height: 22,
        width: '55%',
        borderRadius: 8,
    },
    cardSkeleton: {
        height: 430,
        borderRadius: 24,
    },
});
