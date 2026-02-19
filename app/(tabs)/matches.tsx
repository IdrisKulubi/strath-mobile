import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Alert, Image, ActivityIndicator, Modal, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useMatches, Match } from '@/hooks/use-matches';
import { useConnectionRequests, useRespondToConnectionRequest, type ConnectionRequest } from '@/hooks/use-connection-requests';
import { useCancelSentConnection, useSentConnections, type SentConnection } from '@/hooks/use-sent-connections';
import { useAllMissions } from '@/hooks/use-missions';
import { useNotificationCounts } from '@/hooks/use-notification-counts';
import { MatchesListV2 } from '@/components/matches/matches-list-v2';
import { ArchivedChatsSheet } from '@/components/matches/archived-chats-sheet';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Heart, Archive } from 'phosphor-react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { getAuthToken } from '@/lib/auth-helpers';

const API_URL = process.env.EXPO_PUBLIC_API_URL;

// Unmatch API call
async function unmatchUser(matchId: string): Promise<void> {
    const token = await getAuthToken();

    const response = await fetch(`${API_URL}/api/matches/${matchId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to unmatch');
    }
}

export default function MatchesScreen() {
    const { colors, colorScheme, isDark } = useTheme();
    const router = useRouter();
    const queryClient = useQueryClient();

    const { data, isLoading, refetch } = useMatches();
    const { data: requests = [], isLoading: isRequestsLoading } = useConnectionRequests();
    const { data: sent = [], isLoading: isSentLoading } = useSentConnections();
    const cancelSentMutation = useCancelSentConnection();
    const respondMutation = useRespondToConnectionRequest();
    const { byMatchId: missionsByMatchId } = useAllMissions();
    const { markMatchAsOpened } = useNotificationCounts();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showArchivedSheet, setShowArchivedSheet] = useState(false);
    const [isSentModalOpen, setIsSentModalOpen] = useState(false);
    const [sentModalStartIndex, setSentModalStartIndex] = useState(0);
    const lastSentScrollHapticAt = useRef(0);

    // For now, archived matches are stored locally
    // In production, this would come from the API
    const [archivedMatchIds, setArchivedMatchIds] = useState<Set<string>>(new Set());

    const allMatches = data?.matches ?? [];

    // Filter out archived matches from main list
    const matches = allMatches.filter(m => !archivedMatchIds.has(m.id));
    const archivedMatches = allMatches.filter(m => archivedMatchIds.has(m.id));

    const visibleRequests = useMemo(() => requests.slice(0, 20), [requests]);

    const openSentModal = useCallback((startIndex: number) => {
        const safeIndex = Number.isFinite(startIndex) ? Math.max(0, Math.min(startIndex, Math.max(0, sent.length - 1))) : 0;
        setSentModalStartIndex(safeIndex);
        setIsSentModalOpen(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, [sent.length]);

    const closeSentModal = useCallback(() => {
        setIsSentModalOpen(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const getSentMeta = useCallback((s: SentConnection) => {
        const parts: string[] = [];
        const course = s.toUser.profile?.course;
        const year = s.toUser.profile?.yearOfStudy;
        const university = s.toUser.profile?.university;
        if (course) parts.push(course);
        if (year) parts.push(`Year ${year}`);
        if (university) parts.push(university);
        return parts.length > 0 ? parts.join(' • ') : 'Pending reply';
    }, []);

    const confirmCancelSent = useCallback((s: SentConnection) => {
        Alert.alert(
            'Cancel request?',
            `Are you sure you want to cancel your request to ${s.toUser.name}?`,
            [
                { text: 'Keep', style: 'cancel' },
                {
                    text: 'Cancel request',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                            await cancelSentMutation.mutateAsync(s.swipeId);
                        } catch (e: any) {
                            Alert.alert('Error', e?.message || 'Failed to cancel request');
                        }
                    },
                },
            ]
        );
    }, [cancelSentMutation]);

    const handleRefresh = useCallback(async () => {
        setIsRefreshing(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await refetch();
        setIsRefreshing(false);
    }, [refetch]);

    const handleMatchPress = useCallback((match: Match) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        // Mark the match as opened to clear the badge
        markMatchAsOpened(match.id);
        router.push({ pathname: '/chat/[matchId]', params: { matchId: match.id } } as any);
    }, [router, markMatchAsOpened]);

    const handleExplore = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)');
    }, [router]);

    const handleAcceptRequest = useCallback(async (req: ConnectionRequest) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const res = await respondMutation.mutateAsync({ targetUserId: req.fromUser.id, action: 'like' });
            const isMatch = Boolean(res?.isMatch);
            const matchId = res?.match?.id ?? null;
            if (isMatch && matchId) {
                router.push({ pathname: '/chat/[matchId]', params: { matchId } } as any);
            }
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to accept request');
        }
    }, [respondMutation, router]);

    const handleDeclineRequest = useCallback(async (req: ConnectionRequest) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            await respondMutation.mutateAsync({ targetUserId: req.fromUser.id, action: 'pass' });
        } catch (e: any) {
            Alert.alert('Error', e?.message || 'Failed to decline request');
        }
    }, [respondMutation]);

    const handleArchive = useCallback((match: Match) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setArchivedMatchIds(prev => new Set([...prev, match.id]));
    }, []);

    const handleUnarchive = useCallback((match: Match) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setArchivedMatchIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(match.id);
            return newSet;
        });
    }, []);

    // Unmatch mutation
    const unmatchMutation = useMutation({
        mutationFn: unmatchUser,
        onSuccess: () => {
            // Refresh matches list after successful unmatch
            queryClient.invalidateQueries({ queryKey: ['matches'] });
            queryClient.invalidateQueries({ queryKey: ['notificationCounts'] });
        },
        onError: (error) => {
            Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unmatch');
        },
    });

    const handleUnmatch = useCallback((match: Match) => {
        Alert.alert(
            'Disconnect',
            `Are you sure you want to disconnect from ${match.partner.name}? This will remove your conversation and cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Disconnect',
                    style: 'destructive',
                    onPress: async () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Remove from archived if it was archived
                        setArchivedMatchIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(match.id);
                            return newSet;
                        });
                        // Call the unmatch API
                        unmatchMutation.mutate(match.id);
                    },
                },
            ]
        );
    }, [unmatchMutation]);

    const handleDeleteArchived = useCallback((match: Match) => {
        Alert.alert(
            'Delete Archived Chat',
            `Are you sure you want to permanently delete this chat with ${match.partner.name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        // Remove from archived
                        setArchivedMatchIds(prev => {
                            const newSet = new Set(prev);
                            newSet.delete(match.id);
                            return newSet;
                        });
                        // TODO: Call API to delete the match
                    },
                },
            ]
        );
    }, []);

    const openArchivedSheet = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowArchivedSheet(true);
    };

    const getTimeAgo = useCallback((iso: string) => {
        const created = new Date(iso);
        const diffMs = Date.now() - created.getTime();
        if (!Number.isFinite(diffMs) || diffMs < 0) return '';
        const mins = Math.floor(diffMs / 60000);
        if (mins < 1) return 'now';
        if (mins < 60) return `${mins}m`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h`;
        const days = Math.floor(hours / 24);
        return `${days}d`;
    }, []);

    const getRequestMeta = useCallback((r: ConnectionRequest) => {
        const parts: string[] = [];
        const course = r.fromUser.profile?.course;
        const year = r.fromUser.profile?.yearOfStudy;
        const university = r.fromUser.profile?.university;
        if (course) parts.push(course);
        if (year) parts.push(`Year ${year}`);
        if (university) parts.push(university);
        return parts.length > 0 ? parts.join(' • ') : 'Wants to connect';
    }, []);

    return (
        <SafeAreaView
            style={[styles.container, { backgroundColor: colors.background }]}
            edges={['top']}
        >
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleRow}>
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            style={styles.headerIcon}
                        >
                            <Heart size={18} color="#fff" weight="fill" />
                        </LinearGradient>
                        <Text style={[styles.headerTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                            Matches
                        </Text>
                    </View>

                    {/* Archive Button */}
                    <Pressable
                        style={[
                            styles.archiveButton,
                            { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }
                        ]}
                        onPress={openArchivedSheet}
                    >
                        <Archive size={20} color={isDark ? '#94a3b8' : '#6b7280'} />
                        {archivedMatches.length > 0 && (
                            <View style={styles.archiveBadge}>
                                <Text style={styles.archiveBadgeText}>
                                    {archivedMatches.length > 9 ? '9+' : archivedMatches.length}
                                </Text>
                            </View>
                        )}
                    </Pressable>
                </View>

                {matches.length > 0 && (
                    <Animated.View entering={FadeIn}>
                        <Text style={[styles.headerSubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                            {matches.length} {matches.length === 1 ? 'connection' : 'connections'} waiting to chat
                        </Text>
                    </Animated.View>
                )}
            </View>

            {/* Matches List */}
            <View style={styles.listContainer}>
                {/* Sent (outgoing) */}
                {(isSentLoading || sent.length > 0) && (
                    <View style={styles.sentContainer}>
                        <View style={styles.requestsHeader}>
                            <View style={styles.requestsTitleRow}>
                                <Text style={[styles.requestsEmoji, { color: colors.primary }]}>📨</Text>
                                <Text style={[styles.requestsTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Sent
                                </Text>
                            </View>
                            {isSentLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <LinearGradient
                                    colors={['#ec4899', '#f43f5e']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.sentCountPill}
                                >
                                    <Text style={styles.sentCountPillText}>
                                        {sent.length > 99 ? '99+' : sent.length}
                                    </Text>
                                </LinearGradient>
                            )}
                        </View>

                        <Pressable
                            onPress={() => openSentModal(0)}
                            disabled={isSentLoading || sent.length === 0}
                            style={({ pressed }) => ([
                                styles.sentSummaryCard,
                                {
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    opacity: pressed ? 0.92 : 1,
                                },
                            ])}
                        >
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.sentSummaryTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    {isSentLoading ? 'Loading…' : `${sent.length} pending`}
                                </Text>
                                <Text style={[styles.sentSummarySubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                                    Tap to swipe through them →
                                </Text>
                            </View>

                            <View style={[styles.sentStatusPill, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(236,72,153,0.14)' : 'rgba(236,72,153,0.10)' }]}>
                                <Text style={[styles.sentStatusText, { color: colors.primary }]}>
                                    View
                                </Text>
                            </View>
                        </Pressable>
                    </View>
                )}

                {/* Connection Requests */}
                {(isRequestsLoading || visibleRequests.length > 0) && (
                    <View style={styles.requestsContainer}>
                        <View style={styles.requestsHeader}>
                            <View style={styles.requestsTitleRow}>
                                <Text style={[styles.requestsEmoji, { color: colors.primary }]}>💌</Text>
                                <Text style={[styles.requestsTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Requests
                                </Text>
                            </View>
                            {isRequestsLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <LinearGradient
                                    colors={['#ec4899', '#f43f5e']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.requestsCountPill}
                                >
                                    <Text style={styles.requestsCountPillText}>
                                        {visibleRequests.length}
                                    </Text>
                                </LinearGradient>
                            )}
                        </View>

                        {visibleRequests.map((r) => (
                            <Animated.View
                                entering={FadeIn.duration(220)}
                                key={r.requestId}
                                style={[
                                    styles.requestCard,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                    }
                                ]}
                            >
                                <View style={styles.requestTopRow}>
                                    <View style={styles.requestLeft}>
                                        {(() => {
                                            const avatarUri = r.fromUser.profilePhoto || r.fromUser.image || r.fromUser.profile?.photos?.[0] || null;
                                            if (avatarUri) {
                                                return (
                                                    <Image
                                                        source={{ uri: avatarUri }}
                                                        style={styles.requestAvatar}
                                                    />
                                                );
                                            }

                                            const initial = (r.fromUser.name || "?").trim().charAt(0).toUpperCase();
                                            return (
                                                <View style={[styles.requestAvatar, styles.requestAvatarFallback, { borderColor: colors.border }]}>
                                                    <Text style={[styles.requestAvatarInitial, { color: colors.mutedForeground }]}>
                                                        {initial}
                                                    </Text>
                                                </View>
                                            );
                                        })()}

                                        <View style={{ flex: 1 }}>
                                            <Text style={[styles.requestName, { color: isDark ? '#fff' : '#1a1a2e' }]} numberOfLines={1}>
                                                {r.fromUser.name}
                                            </Text>
                                            <Text style={[styles.requestMeta, { color: isDark ? '#94a3b8' : '#6b7280' }]} numberOfLines={1}>
                                                {getRequestMeta(r)}
                                            </Text>
                                        </View>
                                    </View>

                                    <View style={[styles.requestTimePill, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <Text style={[styles.requestTimeText, { color: colors.mutedForeground }]}>
                                            {getTimeAgo(r.createdAt)}
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.requestActions}>
                                    <Pressable
                                        onPress={() => handleDeclineRequest(r)}
                                        disabled={respondMutation.isPending}
                                        style={[
                                            styles.requestBtn,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                                opacity: respondMutation.isPending ? 0.6 : 1,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.requestBtnText, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                            Decline
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => handleAcceptRequest(r)}
                                        disabled={respondMutation.isPending}
                                        style={{ opacity: respondMutation.isPending ? 0.6 : 1 }}
                                    >
                                        <LinearGradient
                                            colors={['#ec4899', '#f43f5e']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.requestBtnPrimary}
                                        >
                                            <Text style={styles.requestBtnPrimaryText}>
                                                Accept
                                            </Text>
                                        </LinearGradient>
                                    </Pressable>
                                </View>
                            </Animated.View>
                        ))}
                    </View>
                )}

                <MatchesListV2
                    matches={matches}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    onMatchPress={handleMatchPress}
                    onArchive={handleArchive}
                    onUnmatch={handleUnmatch}
                    onExplore={handleExplore}
                    missionsByMatchId={missionsByMatchId}
                />
            </View>

            {/* Sent modal (horizontal carousel) */}
            <Modal
                visible={isSentModalOpen}
                transparent
                animationType="slide"
                onRequestClose={closeSentModal}
            >
                <View style={styles.modalRoot}>
                    <Pressable style={styles.modalBackdrop} onPress={closeSentModal} />

                    <SafeAreaView
                        style={[
                            styles.sentModalSheet,
                            {
                                backgroundColor: isDark ? 'rgba(15, 13, 35, 0.98)' : '#ffffff',
                                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                            },
                        ]}
                        edges={['bottom']}
                    >
                        <View style={styles.sentModalHeader}>
                            <View style={styles.sentModalTitleRow}>
                                <Text style={[styles.sentModalTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Sent
                                </Text>
                                {!isSentLoading && (
                                    <View style={[styles.sentPill, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                        <Text style={[styles.sentPillText, { color: colors.mutedForeground }]}>
                                            {sent.length} pending
                                        </Text>
                                    </View>
                                )}
                            </View>

                            <Pressable
                                onPress={closeSentModal}
                                style={({ pressed }) => ([
                                    styles.sentModalCloseBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        opacity: pressed ? 0.85 : 1,
                                    },
                                ])}
                            >
                                <Text style={[styles.sentModalCloseText, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Close
                                </Text>
                            </Pressable>
                        </View>

                        {isSentLoading ? (
                            <View style={styles.sentModalLoading}>
                                <ActivityIndicator size="small" color={colors.primary} />
                                <Text style={[styles.sentModalLoadingText, { color: colors.mutedForeground }]}>Loading…</Text>
                            </View>
                        ) : sent.length === 0 ? (
                            <View style={styles.sentModalEmpty}>
                                <Text style={[styles.sentModalEmptyTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    No pending requests
                                </Text>
                                <Text style={[styles.sentModalEmptySubtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                                    When you send a connection, it’ll show up here until they respond.
                                </Text>
                            </View>
                        ) : (
                            (() => {
                                const windowWidth = Dimensions.get('window').width;
                                const itemWidth = Math.min(320, Math.max(240, windowWidth - 64));
                                const itemSpacing = 14;
                                const snap = itemWidth + itemSpacing;

                                return (
                                    <FlatList
                                        data={sent}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        keyExtractor={(item) => item.swipeId}
                                        initialScrollIndex={Math.min(sentModalStartIndex, Math.max(0, sent.length - 1))}
                                        getItemLayout={(_, index) => ({ length: snap, offset: snap * index, index })}
                                        snapToInterval={snap}
                                        decelerationRate="fast"
                                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 18 }}
                                        ItemSeparatorComponent={() => <View style={{ width: itemSpacing }} />}
                                        onMomentumScrollEnd={() => {
                                            const now = Date.now();
                                            if (now - lastSentScrollHapticAt.current > 350) {
                                                lastSentScrollHapticAt.current = now;
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                        }}
                                        renderItem={({ item, index }) => {
                                            const avatarUri = item.toUser.profilePhoto || item.toUser.image || item.toUser.profile?.photos?.[0] || null;
                                            return (
                                                <Pressable
                                                    onPress={() => {
                                                        setSentModalStartIndex(index);
                                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                                    }}
                                                    style={({ pressed }) => ([
                                                        styles.sentModalCard,
                                                        {
                                                            width: itemWidth,
                                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                                            borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                                                            opacity: pressed ? 0.92 : 1,
                                                        },
                                                    ])}
                                                >
                                                    <View style={styles.sentModalCardTop}>
                                                        {avatarUri ? (
                                                            <Image source={{ uri: avatarUri }} style={styles.sentModalAvatar} />
                                                        ) : (
                                                            <View style={[styles.sentModalAvatar, styles.requestAvatarFallback, { borderColor: colors.border }]}>
                                                                <Text style={[styles.requestAvatarInitial, { color: colors.mutedForeground }]}>
                                                                    {(item.toUser.name || '?').trim().charAt(0).toUpperCase()}
                                                                </Text>
                                                            </View>
                                                        )}

                                                        <View style={{ flex: 1 }}>
                                                            <Text style={[styles.sentModalName, { color: isDark ? '#fff' : '#1a1a2e' }]} numberOfLines={1}>
                                                                {item.toUser.name}
                                                            </Text>
                                                            <Text style={[styles.sentModalMeta, { color: isDark ? '#94a3b8' : '#6b7280' }]} numberOfLines={2}>
                                                                {getSentMeta(item)}
                                                            </Text>
                                                        </View>
                                                    </View>

                                                    <Pressable
                                                        onPress={() => confirmCancelSent(item)}
                                                        disabled={cancelSentMutation.isPending}
                                                        style={({ pressed }) => ([
                                                            styles.sentModalCancelBtn,
                                                            {
                                                                borderColor: colors.border,
                                                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                                                opacity: cancelSentMutation.isPending ? 0.6 : (pressed ? 0.88 : 1),
                                                            },
                                                        ])}
                                                    >
                                                        <Text style={[styles.sentModalCancelText, { color: colors.primary }]}>Cancel request</Text>
                                                    </Pressable>
                                                </Pressable>
                                            );
                                        }}
                                    />
                                );
                            })()
                        )}
                    </SafeAreaView>
                </View>
            </Modal>

            {/* Archived Chats Sheet */}
            <ArchivedChatsSheet
                visible={showArchivedSheet}
                onClose={() => setShowArchivedSheet(false)}
                archivedMatches={archivedMatches}
                isLoading={false}
                onMatchPress={(match) => {
                    setShowArchivedSheet(false);
                    setTimeout(() => handleMatchPress(match), 300);
                }}
                onUnarchive={handleUnarchive}
                onDelete={handleDeleteArchived}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        lineHeight: 36,
    },
    headerSubtitle: {
        fontSize: 14,
        marginTop: 6,
        fontWeight: '500',
    },
    archiveButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    archiveBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ec4899',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    archiveBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    listContainer: {
        flex: 1,
    },

    // Requests
    requestsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 10,
    },

    // Sent
    sentContainer: {
        paddingHorizontal: 16,
        paddingBottom: 10,
        gap: 10,
    },
    sentCountPill: {
        minWidth: 30,
        height: 22,
        borderRadius: 999,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentCountPillText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    sentPill: {
        borderWidth: 1,
        paddingHorizontal: 10,
        height: 26,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentPillText: {
        fontSize: 11,
        fontWeight: '700',
    },
    sentSummaryCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    sentSummaryTitle: {
        fontSize: 14,
        fontWeight: '800',
    },
    sentSummarySubtitle: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 4,
    },
    sentStatusPill: {
        borderWidth: 1,
        paddingHorizontal: 10,
        height: 26,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentStatusText: {
        fontSize: 11,
        fontWeight: '800',
    },

    // Sent modal
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sentModalSheet: {
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderWidth: 1,
        paddingTop: 14,
    },
    sentModalHeader: {
        paddingHorizontal: 18,
        paddingBottom: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    sentModalTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    sentModalTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    sentModalCloseBtn: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentModalCloseText: {
        fontSize: 12,
        fontWeight: '800',
    },
    sentModalLoading: {
        paddingHorizontal: 18,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sentModalLoadingText: {
        fontSize: 12,
        fontWeight: '600',
    },
    sentModalEmpty: {
        paddingHorizontal: 18,
        paddingVertical: 18,
        gap: 6,
    },
    sentModalEmptyTitle: {
        fontSize: 16,
        fontWeight: '800',
    },
    sentModalEmptySubtitle: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    sentModalCard: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        gap: 12,
    },
    sentModalCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sentModalAvatar: {
        width: 56,
        height: 56,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    sentModalName: {
        fontSize: 16,
        fontWeight: '800',
    },
    sentModalMeta: {
        fontSize: 12,
        fontWeight: '600',
        marginTop: 3,
        lineHeight: 16,
    },
    sentModalCancelBtn: {
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentModalCancelText: {
        fontSize: 12,
        fontWeight: '800',
    },
    requestsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 6,
    },
    requestsTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    requestsEmoji: {
        fontSize: 16,
        paddingTop: 1,
    },
    requestsTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    requestsCountPill: {
        minWidth: 30,
        height: 22,
        borderRadius: 999,
        paddingHorizontal: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestsCountPillText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '800',
    },
    requestCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 12,
        gap: 10,
    },
    requestTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    requestLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    requestTimePill: {
        borderWidth: 1,
        paddingHorizontal: 10,
        height: 26,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestTimeText: {
        fontSize: 11,
        fontWeight: '700',
    },
    requestAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    requestAvatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    requestAvatarInitial: {
        fontSize: 16,
        fontWeight: '800',
    },
    requestName: {
        fontSize: 14,
        fontWeight: '700',
    },
    requestMeta: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 10,
        justifyContent: 'flex-end',
    },
    requestBtn: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        borderWidth: 1,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestBtnText: {
        fontSize: 12,
        fontWeight: '700',
    },
    requestBtnPrimary: {
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 999,
        minWidth: 88,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestBtnPrimaryText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
});
