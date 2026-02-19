import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useMatches, Match } from '@/hooks/use-matches';
import { useConnectionRequests, useRespondToConnectionRequest, type ConnectionRequest } from '@/hooks/use-connection-requests';
import { useSentConnections, type SentConnection } from '@/hooks/use-sent-connections';
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
    const respondMutation = useRespondToConnectionRequest();
    const { byMatchId: missionsByMatchId } = useAllMissions();
    const { markMatchAsOpened } = useNotificationCounts();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showArchivedSheet, setShowArchivedSheet] = useState(false);

    // For now, archived matches are stored locally
    // In production, this would come from the API
    const [archivedMatchIds, setArchivedMatchIds] = useState<Set<string>>(new Set());

    const allMatches = data?.matches ?? [];

    // Filter out archived matches from main list
    const matches = allMatches.filter(m => !archivedMatchIds.has(m.id));
    const archivedMatches = allMatches.filter(m => archivedMatchIds.has(m.id));

    const visibleRequests = useMemo(() => requests.slice(0, 20), [requests]);
    const visibleSent = useMemo(() => sent.slice(0, 12), [sent]);

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
                {(isSentLoading || visibleSent.length > 0) && (
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
                                <View style={[styles.sentPill, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                    <Text style={[styles.sentPillText, { color: colors.mutedForeground }]}>
                                        pending
                                    </Text>
                                </View>
                            )}
                        </View>

                        {visibleSent.map((s) => (
                            <Animated.View
                                entering={FadeIn.duration(220)}
                                key={s.swipeId}
                                style={[
                                    styles.sentCard,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#ffffff',
                                        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                                    }
                                ]}
                            >
                                <View style={styles.sentLeft}>
                                    {(() => {
                                        const avatarUri = s.toUser.profilePhoto || s.toUser.image || s.toUser.profile?.photos?.[0] || null;
                                        if (avatarUri) {
                                            return (
                                                <Image
                                                    source={{ uri: avatarUri }}
                                                    style={styles.sentAvatar}
                                                />
                                            );
                                        }
                                        const initial = (s.toUser.name || "?").trim().charAt(0).toUpperCase();
                                        return (
                                            <View style={[styles.sentAvatar, styles.requestAvatarFallback, { borderColor: colors.border }]}>
                                                <Text style={[styles.requestAvatarInitial, { color: colors.mutedForeground }]}>
                                                    {initial}
                                                </Text>
                                            </View>
                                        );
                                    })()}

                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.sentName, { color: isDark ? '#fff' : '#1a1a2e' }]} numberOfLines={1}>
                                            {s.toUser.name}
                                        </Text>
                                        <Text style={[styles.sentMeta, { color: isDark ? '#94a3b8' : '#6b7280' }]} numberOfLines={1}>
                                            {s.toUser.profile?.course || 'Waiting for reply'}
                                        </Text>
                                    </View>
                                </View>

                                <View style={[styles.sentStatusPill, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(236,72,153,0.14)' : 'rgba(236,72,153,0.10)' }]}>
                                    <Text style={[styles.sentStatusText, { color: colors.primary }]}>
                                        Pending
                                    </Text>
                                </View>
                            </Animated.View>
                        ))}
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
    sentCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    sentLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    sentAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    sentName: {
        fontSize: 14,
        fontWeight: '700',
    },
    sentMeta: {
        fontSize: 12,
        fontWeight: '500',
        marginTop: 2,
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
