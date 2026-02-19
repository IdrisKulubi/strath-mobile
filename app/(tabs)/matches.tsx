import React, { useCallback, useMemo, useState } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Alert, Image, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { useMatches, Match } from '@/hooks/use-matches';
import { useConnectionRequests, useRespondToConnectionRequest, type ConnectionRequest } from '@/hooks/use-connection-requests';
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
                            Connections
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
                {/* Connection Requests */}
                {(isRequestsLoading || visibleRequests.length > 0) && (
                    <View style={styles.requestsContainer}>
                        <View style={styles.requestsHeader}>
                            <Text style={[styles.requestsTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                Requests
                            </Text>
                            {isRequestsLoading ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Text style={[styles.requestsCount, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                                    {visibleRequests.length}
                                </Text>
                            )}
                        </View>

                        {visibleRequests.map((r) => (
                            <View
                                key={r.requestId}
                                style={[
                                    styles.requestCard,
                                    {
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
                                    }
                                ]}
                            >
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
                                        <Text style={[styles.requestName, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                                            {r.fromUser.name}
                                        </Text>
                                        <Text style={[styles.requestMeta, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
                                            {r.fromUser.profile?.course || 'Wants to connect'}
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
                            </View>
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
    requestsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
        marginTop: 6,
    },
    requestsTitle: {
        fontSize: 14,
        fontWeight: '700',
    },
    requestsCount: {
        fontSize: 12,
        fontWeight: '600',
    },
    requestCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 12,
        gap: 10,
    },
    requestLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
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
