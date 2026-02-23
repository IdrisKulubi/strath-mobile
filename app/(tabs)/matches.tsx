import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Alert, Image, ActivityIndicator, Modal, FlatList, LayoutAnimation, Platform, useWindowDimensions } from 'react-native';
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
import { Heart, Archive, CaretDown } from 'phosphor-react-native';
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
    const [sentDetails, setSentDetails] = useState<SentConnection | null>(null);
    const [isSentExpanded, setIsSentExpanded] = useState(false);
    const [activeSentIndex, setActiveSentIndex] = useState(0);
    const lastSentScrollHapticAt = useRef(0);
    const { width: screenWidth } = useWindowDimensions();
    // Pager geometry: card fills screen minus side padding + peek
    const SENT_CARD_SPACING = 14;
    const SENT_CARD_WIDTH = screenWidth - 48; // 24px side peek on each side
    const SENT_SNAP_INTERVAL = SENT_CARD_WIDTH + SENT_CARD_SPACING;

    const toggleSentExpanded = useCallback(() => {
        if (Platform.OS === 'android') {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        } else {
            LayoutAnimation.configureNext({
                duration: 280,
                create: { type: 'easeInEaseOut', property: 'opacity' },
                update: { type: 'spring', springDamping: 0.9 },
                delete: { type: 'easeInEaseOut', property: 'opacity' },
            });
        }
        setIsSentExpanded(prev => !prev);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    // For now, archived matches are stored locally
    // In production, this would come from the API
    const [archivedMatchIds, setArchivedMatchIds] = useState<Set<string>>(new Set());

    const allMatches = data?.matches ?? [];

    // Filter out archived matches from main list
    const matches = allMatches.filter(m => !archivedMatchIds.has(m.id));
    const archivedMatches = allMatches.filter(m => archivedMatchIds.has(m.id));

    const visibleRequests = useMemo(() => requests.slice(0, 20), [requests]);

    const openSentDetails = useCallback((s: SentConnection) => {
        setSentDetails(s);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const closeSentDetails = useCallback(() => {
        setSentDetails(null);
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
        router.push('/(tabs)/explore');
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
                            {matches.length} {matches.length === 1 ? 'connection' : 'connections'} — tap one to start chatting
                        </Text>
                    </Animated.View>
                )}
            </View>

            {/* Matches List */}
            <View style={styles.listContainer}>
                {/* Sent (outgoing) */}
                {(isSentLoading || sent.length > 0) && (
                    <View style={styles.sentContainer}>
                        {/* Collapsible header row */}
                        <Pressable
                            onPress={toggleSentExpanded}
                            style={({ pressed }) => ([styles.sentCollapseHeader, { opacity: pressed ? 0.8 : 1 }])}
                        >
                            <View style={styles.requestsTitleRow}>
                                <Text style={styles.requestsEmoji}>📨</Text>
                                <Text style={[styles.requestsTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Sent requests
                                </Text>
                            </View>

                            <View style={styles.sentCollapseRight}>
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
                                <CaretDown
                                    size={16}
                                    color={isDark ? '#94a3b8' : '#6b7280'}
                                    weight="bold"
                                    style={{
                                        transform: [{ rotate: isSentExpanded ? '0deg' : '-90deg' }],
                                    }}
                                />
                            </View>
                        </Pressable>

                        {/* Expandable content */}
                        {isSentExpanded && (
                            isSentLoading ? (
                                <View style={styles.sentStripLoading}>
                                    <ActivityIndicator size="small" color={colors.primary} />
                                    <Text style={[styles.sentStripLoadingText, { color: colors.mutedForeground }]}>Loading sent…</Text>
                                </View>
                            ) : (
                                // Pull strip edge-to-edge so peek works
                                <View style={styles.sentStripOuter}>
                                    <FlatList
                                        data={sent}
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        keyExtractor={(item) => item.swipeId}
                                        snapToInterval={SENT_SNAP_INTERVAL}
                                        decelerationRate="fast"
                                        contentContainerStyle={{ paddingHorizontal: 16 }}
                                        ItemSeparatorComponent={() => <View style={{ width: SENT_CARD_SPACING }} />}
                                        onMomentumScrollEnd={(e) => {
                                            const now = Date.now();
                                            if (now - lastSentScrollHapticAt.current > 300) {
                                                lastSentScrollHapticAt.current = now;
                                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                            }
                                            const idx = Math.round(e.nativeEvent.contentOffset.x / SENT_SNAP_INTERVAL);
                                            setActiveSentIndex(Math.max(0, Math.min(idx, sent.length - 1)));
                                        }}
                                        renderItem={({ item, index }) => {
                                            const isActive = index === activeSentIndex;
                                            const avatarUri = item.toUser.profilePhoto || item.toUser.image || item.toUser.profile?.photos?.[0] || null;
                                            return (
                                                <Pressable
                                                    onPress={() => openSentDetails(item)}
                                                    style={({ pressed }) => ([
                                                        styles.sentStripCard,
                                                        {
                                                            width: SENT_CARD_WIDTH,
                                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                                            borderColor: isActive
                                                                ? (isDark ? 'rgba(236,72,153,0.45)' : 'rgba(236,72,153,0.30)')
                                                                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                                                            opacity: pressed ? 0.9 : (isActive ? 1 : 0.45),
                                                            transform: [{ scale: isActive ? 1 : 0.96 }],
                                                        },
                                                    ])}
                                                >
                                                    <View style={styles.sentStripImageFrame}>
                                                        {avatarUri ? (
                                                            <Image
                                                                source={{ uri: avatarUri }}
                                                                style={styles.sentStripImage}
                                                                resizeMode="cover"
                                                            />
                                                        ) : (
                                                            <View style={[styles.sentStripImageFallback, styles.requestAvatarFallback, { borderColor: colors.border }]}>
                                                                <Text style={[styles.requestAvatarInitial, { fontSize: 22, color: colors.mutedForeground }]}>
                                                                    {(item.toUser.name || '?').trim().charAt(0).toUpperCase()}
                                                                </Text>
                                                            </View>
                                                        )}
                                                    </View>

                                                    <View style={styles.sentStripCardBody}>
                                                        <Text style={[styles.sentStripName, { color: isDark ? '#fff' : '#1a1a2e' }]} numberOfLines={1}>
                                                            {item.toUser.name}
                                                        </Text>
                                                        <Text style={[styles.sentStripMeta, { color: isDark ? '#94a3b8' : '#6b7280' }]} numberOfLines={1}>
                                                            {getSentMeta(item) || 'Pending reply'}
                                                        </Text>
                                                    </View>
                                                </Pressable>
                                            );
                                        }}
                                    />
                                </View>
                            )
                        )}
                    </View>
                )}

                {/* Connection Requests */}
                {(isRequestsLoading || visibleRequests.length > 0) && (
                    <View style={styles.requestsContainer}>
                        <View style={styles.requestsHeader}>
                            <View style={styles.requestsTitleRow}>
                                <Text style={styles.requestsEmoji}>💌</Text>
                                <Text style={[styles.requestsTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Incoming requests
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
                                        borderColor: isDark ? 'rgba(236,72,153,0.22)' : 'rgba(236,72,153,0.16)',
                                    }
                                ]}
                            >
                                <View style={styles.requestTopRow}>
                                    {/* Avatar — rounded square */}
                                    {(() => {
                                        const avatarUri = r.fromUser.profilePhoto || r.fromUser.image || r.fromUser.profile?.photos?.[0] || null;
                                        if (avatarUri) {
                                            return (
                                                <Image
                                                    source={{ uri: avatarUri }}
                                                    style={styles.requestAvatar}
                                                    resizeMode="cover"
                                                />
                                            );
                                        }
                                        const initial = (r.fromUser.name || '?').trim().charAt(0).toUpperCase();
                                        return (
                                            <LinearGradient
                                                colors={['#ec4899', '#f43f5e']}
                                                style={[styles.requestAvatar, { alignItems: 'center', justifyContent: 'center' }]}
                                            >
                                                <Text style={[styles.requestAvatarInitial, { color: '#fff' }]}>
                                                    {initial}
                                                </Text>
                                            </LinearGradient>
                                        );
                                    })()}

                                    {/* Info */}
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.requestNameRow}>
                                            <Text style={[styles.requestName, { color: isDark ? '#fff' : '#1a1a2e' }]} numberOfLines={1}>
                                                {r.fromUser.name}
                                            </Text>
                                            <View style={[styles.requestTimePill, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                                <Text style={[styles.requestTimeText, { color: colors.mutedForeground }]}>
                                                    {getTimeAgo(r.createdAt)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Text style={[styles.requestMeta, { color: isDark ? '#94a3b8' : '#6b7280' }]} numberOfLines={1}>
                                            {getRequestMeta(r)}
                                        </Text>
                                    </View>
                                </View>

                                {/* Actions */}
                                <View style={styles.requestActions}>
                                    <Pressable
                                        onPress={() => handleDeclineRequest(r)}
                                        disabled={respondMutation.isPending}
                                        style={[
                                            styles.requestBtnDecline,
                                            {
                                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
                                                opacity: respondMutation.isPending ? 0.6 : 1,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.requestBtnDeclineText, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                                            Decline
                                        </Text>
                                    </Pressable>

                                    <Pressable
                                        onPress={() => handleAcceptRequest(r)}
                                        disabled={respondMutation.isPending}
                                        style={[{ flex: 1, borderRadius: 999, overflow: 'hidden' }, respondMutation.isPending && { opacity: 0.6 }]}
                                    >
                                        <LinearGradient
                                            colors={['#ec4899', '#f43f5e']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={styles.requestBtnAccept}
                                        >
                                            <Heart size={14} color="#fff" weight="fill" />
                                            <Text style={styles.requestBtnAcceptText}>
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

            {/* Sent details sheet */}
            <Modal
                visible={Boolean(sentDetails)}
                transparent
                animationType="fade"
                onRequestClose={closeSentDetails}
            >
                <View style={styles.modalRoot}>
                    <Pressable style={styles.modalBackdrop} onPress={closeSentDetails} />

                    <SafeAreaView
                        style={[
                            styles.sentDetailsSheet,
                            {
                                backgroundColor: isDark ? 'rgba(15, 13, 35, 0.98)' : '#ffffff',
                                borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.08)',
                            },
                        ]}
                        edges={['bottom']}
                    >
                        <View style={styles.sentDetailsHeader}>
                            <Text style={[styles.sentDetailsTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                {sentDetails?.toUser.name ?? 'Sent'}
                            </Text>
                            <Pressable
                                onPress={closeSentDetails}
                                style={({ pressed }) => ([
                                    styles.sentDetailsCloseBtn,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                                        opacity: pressed ? 0.85 : 1,
                                    },
                                ])}
                            >
                                <Text style={[styles.sentDetailsCloseText, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                    Close
                                </Text>
                            </Pressable>
                        </View>

                        {sentDetails && (
                            <View style={styles.sentDetailsBody}>
                                {(() => {
                                    const avatarUri = sentDetails.toUser.profilePhoto || sentDetails.toUser.image || sentDetails.toUser.profile?.photos?.[0] || null;
                                    if (avatarUri) {
                                        return <Image source={{ uri: avatarUri }} style={styles.sentDetailsAvatar} />;
                                    }
                                    return (
                                        <View style={[styles.sentDetailsAvatar, styles.requestAvatarFallback, { borderColor: colors.border }]}>
                                            <Text style={[styles.requestAvatarInitial, { color: colors.mutedForeground }]}>
                                                {(sentDetails.toUser.name || '?').trim().charAt(0).toUpperCase()}
                                            </Text>
                                        </View>
                                    );
                                })()}

                                <View style={{ flex: 1 }}>
                                    <Text style={[styles.sentDetailsMeta, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                                        {getSentMeta(sentDetails)}
                                    </Text>
                                    <View style={[styles.sentStatusPill, { alignSelf: 'flex-start', marginTop: 10, borderColor: colors.border, backgroundColor: isDark ? 'rgba(236,72,153,0.14)' : 'rgba(236,72,153,0.10)' }]}>
                                        <Text style={[styles.sentStatusText, { color: colors.primary }]}>
                                            Pending
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        )}

                        <Pressable
                            onPress={() => sentDetails && confirmCancelSent(sentDetails)}
                            disabled={!sentDetails || cancelSentMutation.isPending}
                            style={({ pressed }) => ([
                                styles.sentDetailsCancelBtn,
                                {
                                    borderColor: colors.border,
                                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)',
                                    opacity: cancelSentMutation.isPending ? 0.6 : (pressed ? 0.88 : 1),
                                },
                            ])}
                        >
                            <Text style={[styles.sentDetailsCancelText, { color: colors.primary }]}>Cancel request</Text>
                        </Pressable>
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
        fontWeight: '800',
        lineHeight: 34,
        letterSpacing: -0.5,
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
        gap: 8,
    },
    sentCollapseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    sentCollapseRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sentStripOuter: {
        // negative margin to pull the strip edge-to-edge
        marginHorizontal: -16,
    },
    sentStripLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 4,
        paddingTop: 2,
    },
    sentStripLoadingText: {
        fontSize: 12,
        fontWeight: '600',
    },
    sentStripCard: {
        height: 260,
        borderRadius: 24,
        borderWidth: 1,
        padding: 10,
        gap: 10,
    },
    sentStripImageFrame: {
        width: '100%',
        height: 176,
        borderRadius: 18,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    sentStripImage: {
        width: '100%',
        height: '100%',
    },
    sentStripImageFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderRadius: 18,
    },
    sentStripCardBody: {
        flex: 1,
        paddingHorizontal: 2,
        justifyContent: 'center',
        gap: 6,
    },
    sentStripName: {
        fontSize: 15,
        fontWeight: '800',
    },
    sentStripMeta: {
        fontSize: 12,
        fontWeight: '600',
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

    // Modals
    modalRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sentDetailsSheet: {
        borderTopLeftRadius: 22,
        borderTopRightRadius: 22,
        borderWidth: 1,
        paddingTop: 14,
        paddingHorizontal: 18,
        paddingBottom: 16,
        gap: 14,
    },
    sentDetailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    sentDetailsTitle: {
        fontSize: 18,
        fontWeight: '800',
        flex: 1,
    },
    sentDetailsCloseBtn: {
        paddingHorizontal: 12,
        height: 36,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentDetailsCloseText: {
        fontSize: 12,
        fontWeight: '800',
    },
    sentDetailsBody: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    sentDetailsAvatar: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    sentDetailsMeta: {
        fontSize: 13,
        fontWeight: '600',
        lineHeight: 18,
    },
    sentDetailsCancelBtn: {
        borderWidth: 1,
        borderRadius: 999,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sentDetailsCancelText: {
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
        borderRadius: 20,
        borderWidth: 1,
        padding: 14,
        gap: 12,
    },
    requestTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    requestNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    requestTimePill: {
        borderWidth: 1,
        paddingHorizontal: 9,
        height: 24,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestTimeText: {
        fontSize: 11,
        fontWeight: '600',
    },
    requestAvatar: {
        width: 58,
        height: 58,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    requestAvatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        backgroundColor: 'transparent',
    },
    requestAvatarInitial: {
        fontSize: 22,
        fontWeight: '800',
    },
    requestName: {
        fontSize: 15,
        fontWeight: '700',
        flex: 1,
        marginRight: 8,
    },
    requestMeta: {
        fontSize: 12,
        fontWeight: '500',
    },
    requestActions: {
        flexDirection: 'row',
        gap: 10,
    },
    requestBtnDecline: {
        paddingHorizontal: 18,
        paddingVertical: 11,
        borderRadius: 999,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    requestBtnDeclineText: {
        fontSize: 13,
        fontWeight: '700',
    },
    requestBtnAccept: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 11,
        borderRadius: 999,
    },
    requestBtnAcceptText: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
});
