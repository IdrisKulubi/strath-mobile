import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Pressable, Alert, Image, ActivityIndicator, Modal, ScrollView, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
import { Heart, Archive, ArrowLeft, X, PaperPlaneTilt } from 'phosphor-react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { FadeIn, Easing, runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

interface ActivityHubSheetProps {
    visible: boolean;
    title: string;
    subtitle: string;
    isDark: boolean;
    onClose: () => void;
    children: React.ReactNode;
}

function ActivityHubSheet({ visible, title, subtitle, isDark, onClose, children }: ActivityHubSheetProps) {
    const translateY = useSharedValue(900);
    const dragStartY = useSharedValue(0);

    useEffect(() => {
        if (!visible) return;
        translateY.value = 900;
        translateY.value = withSpring(0, { damping: 25, stiffness: 300, mass: 0.8 });
    }, [visible, translateY]);

    const closeSheet = useCallback(() => {
        translateY.value = withTiming(900, { duration: 180 }, () => {
            runOnJS(onClose)();
        });
    }, [onClose, translateY]);

    const panGesture = Gesture.Pan()
        .onBegin(() => {
            dragStartY.value = translateY.value;
        })
        .onUpdate((event) => {
            const next = dragStartY.value + event.translationY;
            translateY.value = Math.max(0, next);
        })
        .onEnd((event) => {
            const shouldClose = translateY.value > 160 || event.velocityY > 1200;
            if (shouldClose) {
                runOnJS(closeSheet)();
                return;
            }
            translateY.value = withSpring(0, { damping: 25, stiffness: 300, mass: 0.8 });
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    if (!visible) return null;

    return (
        <Modal transparent visible onRequestClose={closeSheet} animationType="fade">
            <GestureHandlerRootView style={styles.activitySheetRoot}>
                <Pressable style={styles.activitySheetBackdrop} onPress={closeSheet} />

                <GestureDetector gesture={panGesture}>
                    <Animated.View
                        style={[
                            styles.activitySheet,
                            sheetStyle,
                            {
                                backgroundColor: isDark ? '#120B1E' : '#ffffff',
                                borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.08)',
                            },
                        ]}
                    >
                        <View style={[styles.activitySheetHandle, { backgroundColor: isDark ? 'rgba(255,255,255,0.20)' : 'rgba(0,0,0,0.16)' }]} />

                        <View style={styles.activitySheetHeader}>
                            <Pressable onPress={closeSheet} style={styles.activitySheetBackBtn}>
                                <ArrowLeft size={20} color={isDark ? '#fff' : '#1a1a2e'} weight="bold" />
                            </Pressable>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.activitySheetTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>{title}</Text>
                                <Text style={[styles.activitySheetSubtitle, { color: isDark ? '#a9a1b8' : '#64748b' }]}>{subtitle}</Text>
                            </View>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.activitySheetContent}>
                            {children}
                        </ScrollView>
                    </Animated.View>
                </GestureDetector>
            </GestureHandlerRootView>
        </Modal>
    );
}

export default function MatchesScreen() {
    const { colors, colorScheme, isDark } = useTheme();
    const router = useRouter();

    const { data, isLoading, refetch } = useMatches();
    const { data: requests = [], isLoading: isRequestsLoading } = useConnectionRequests();
    const { data: sent = [], isLoading: isSentLoading } = useSentConnections();
    const cancelSentMutation = useCancelSentConnection();
    const respondMutation = useRespondToConnectionRequest();
    const { byMatchId: missionsByMatchId } = useAllMissions();
    const { markMatchAsOpened } = useNotificationCounts();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [showArchivedSheet, setShowArchivedSheet] = useState(false);
    const [showSentSheet, setShowSentSheet] = useState(false);
    const [showIncomingSheet, setShowIncomingSheet] = useState(false);
    const [nudgeNotice, setNudgeNotice] = useState<string | null>(null);
    const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { width: screenWidth } = useWindowDimensions();
    const nudgeFlyX = useSharedValue(-120);
    const nudgeFlyOpacity = useSharedValue(0);

    const nudgeFlyStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: nudgeFlyX.value }],
        opacity: nudgeFlyOpacity.value,
    }));

    useEffect(() => {
        return () => {
            if (nudgeTimerRef.current) {
                clearTimeout(nudgeTimerRef.current);
                nudgeTimerRef.current = null;
            }
        };
    }, []);

    // For now, archived matches are stored locally
    // In production, this would come from the API
    const [archivedMatchIds, setArchivedMatchIds] = useState<Set<string>>(new Set());

    const allMatches = data?.matches ?? [];

    // Filter out archived matches from main list
    const matches = allMatches.filter(m => !archivedMatchIds.has(m.id));
    const archivedMatches = allMatches.filter(m => archivedMatchIds.has(m.id));

    const visibleRequests = useMemo(() => requests.slice(0, 20), [requests]);

    const handleOpenSentSheet = useCallback(() => {
        setShowSentSheet(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handleCloseSentSheet = useCallback(() => {
        setShowSentSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleOpenIncomingSheet = useCallback(() => {
        setShowIncomingSheet(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const handleCloseIncomingSheet = useCallback(() => {
        setShowIncomingSheet(false);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    const handleNudgeAgain = useCallback((item: SentConnection) => {
        const name = item.toUser.name?.trim() || 'them';
        setNudgeNotice(`Nudge sent to ${name}`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

        nudgeFlyX.value = -120;
        nudgeFlyOpacity.value = 1;
        nudgeFlyX.value = withTiming(screenWidth + 120, {
            duration: 1050,
            easing: Easing.out(Easing.cubic),
        });
        nudgeFlyOpacity.value = withTiming(0, { duration: 1100 });

        if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
        nudgeTimerRef.current = setTimeout(() => {
            setNudgeNotice(null);
        }, 1150);
    }, [nudgeFlyOpacity, nudgeFlyX, screenWidth]);

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

    const handleUnarchive = useCallback((match: Match) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setArchivedMatchIds(prev => {
            const newSet = new Set(prev);
            newSet.delete(match.id);
            return newSet;
        });
    }, []);

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
            style={[styles.container, { backgroundColor: isDark ? '#120B1E' : colors.background }]}
            edges={['top']}
        >
            <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <View style={styles.headerTitleRow}>
                        
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
                <View style={styles.connectionSpacesWrap}>
                    <View style={[styles.activityHubContainer, { backgroundColor: '#1D1429', borderColor: 'rgba(255,255,255,0.08)' }]}>
                        <Text style={styles.activityHubTitle}>Activity Hub</Text>

                        <View style={styles.activityHubRow}>
                            <View style={styles.activityCardCol}>
                                <View style={[styles.activityCard, styles.activityCardGold]}>
                                    <View style={styles.activityCardTop}>
                                        <Text style={styles.activityCardTagGold}>Your Moves</Text>
                                        <View style={styles.activityCountBadgeGold}>
                                            <Text style={styles.activityCountTextDark}>{sent.length > 99 ? '99+' : sent.length}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.activityCardContent}>
                                        <View style={styles.activityEmojiWrap}>
                                            <Text style={styles.activityEmoji}>💘</Text>
                                        </View>
                                        <Text
                                            style={styles.activityCardTitle}
                                            numberOfLines={2}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.9}
                                        >
                                            Sent Requests
                                        </Text>
                                        <Text style={styles.activityCardSubtitle} numberOfLines={2}>
                                            {sent.length === 0
                                                ? 'Send likes in Discover to see your requests here.'
                                                : 'People you already liked'}
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={handleOpenSentSheet}
                                        style={({ pressed }) => ([
                                            styles.activityCtaGold,
                                            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
                                        ])}
                                    >
                                        <Text style={styles.activityCtaTextDark}>View</Text>
                                    </Pressable>
                                </View>
                            </View>

                            <View style={styles.activityCardCol}>
                                <View style={[styles.activityCard, styles.activityCardPink]}>
                                    <View style={styles.activityCardTop}>
                                        <Text style={styles.activityCardTagPink}>For You</Text>
                                        <View style={styles.activityCountBadgePink}>
                                            <Text style={styles.activityCountTextLight}>{visibleRequests.length}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.activityCardContent}>
                                        <View style={styles.activityEmojiWrap}>
                                            <Text style={styles.activityEmoji}>💌</Text>
                                        </View>
                                        <Text
                                            style={styles.activityCardTitle}
                                            numberOfLines={2}
                                            adjustsFontSizeToFit
                                            minimumFontScale={0.9}
                                        >
                                            Incoming Likes
                                        </Text>
                                        <Text style={styles.activityCardSubtitle} numberOfLines={2}>
                                            {visibleRequests.length === 0
                                                ? 'Keep your profile active to attract incoming likes.'
                                                : 'People who liked your profile'}
                                        </Text>
                                    </View>

                                    <Pressable
                                        onPress={handleOpenIncomingSheet}
                                        style={({ pressed }) => ([
                                            styles.activityCtaPink,
                                            { opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
                                        ])}
                                    >
                                        <Text style={styles.activityCtaTextLight}>Review</Text>
                                    </Pressable>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={[styles.messagePreviewSection, { backgroundColor: '#1D1429', borderColor: 'rgba(255,255,255,0.08)' }]}>
                        <View style={styles.messagePreviewHeader}>
                            <Text style={styles.messagePreviewTitle}>Recent chats</Text>
                            <Text style={styles.messagePreviewCount}>{matches.length}</Text>
                        </View>

                        {matches.length === 0 ? (
                            <View style={styles.messagePreviewEmpty}>
                                <Text style={styles.messagePreviewEmptyText}>No chats yet — your first conversation will appear here.</Text>
                            </View>
                        ) : (
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.messagePreviewScroll}
                            >
                                {matches.map((match) => {
                                    const avatarUri = match.partner.image || match.partner.profile?.profilePhoto || match.partner.profile?.photos?.[0] || null;
                                    const previewText = match.lastMessage?.content?.trim() || 'You matched — say hi 👋';
                                    const previewTime = getTimeAgo(match.lastMessage?.createdAt || match.createdAt);

                                    return (
                                        <Pressable
                                            key={`preview-${match.id}`}
                                            onPress={() => handleMatchPress(match)}
                                            style={({ pressed }) => ([
                                                styles.messagePreviewCard,
                                                {
                                                    borderColor: match.unreadCount > 0 ? 'rgba(236,72,153,0.36)' : 'rgba(255,255,255,0.10)',
                                                    backgroundColor: 'rgba(255,255,255,0.04)',
                                                    opacity: pressed ? 0.9 : 1,
                                                    transform: [{ scale: pressed ? 0.985 : 1 }],
                                                },
                                            ])}
                                        >
                                            {avatarUri ? (
                                                <Image source={{ uri: avatarUri }} style={styles.messagePreviewAvatar} resizeMode="cover" />
                                            ) : (
                                                <View style={[styles.messagePreviewAvatar, styles.requestAvatarFallback, { borderColor: colors.border }]}>
                                                    <Text style={[styles.requestAvatarInitial, { color: '#cbd5e1' }]}>
                                                        {(match.partner.name || '?').trim().charAt(0).toUpperCase()}
                                                    </Text>
                                                </View>
                                            )}

                                            <View style={{ flex: 1 }}>
                                                <View style={styles.messagePreviewTopRow}>
                                                    <Text style={styles.messagePreviewName} numberOfLines={1}>{match.partner.name}</Text>
                                                    <Text style={styles.messagePreviewTime}>{previewTime}</Text>
                                                </View>

                                                <Text style={styles.messagePreviewText} numberOfLines={2}>{previewText}</Text>
                                            </View>
                                        </Pressable>
                                    );
                                })}
                            </ScrollView>
                        )}
                    </View>

                    {!isSentLoading && !isRequestsLoading && (sent.length === 0 || visibleRequests.length === 0) && (
                        <View style={styles.heartEmptyHint}>
                            <Text style={styles.heartEmptyHintTitle}>Keep your profile active ✨</Text>
                            <Text style={styles.heartEmptyHintSubtitle}>
                                Send likes in Discover and keep your profile fresh to get more incoming likes.
                            </Text>
                        </View>
                    )}
                </View>

                <MatchesListV2
                    matches={matches}
                    isLoading={isLoading}
                    isRefreshing={isRefreshing}
                    onRefresh={handleRefresh}
                    onMatchPress={handleMatchPress}
                    missionsByMatchId={missionsByMatchId}
                />
            </View>

            <ActivityHubSheet
                visible={showSentSheet}
                onClose={handleCloseSentSheet}
                title="Bold Moves"
                subtitle="Your bold connections. Track where you've reached out."
                isDark={isDark}
            >
                {isSentLoading ? (
                    <View style={styles.sheetLoadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.sheetLoadingText, { color: '#94a3b8' }]}>Loading sent requests…</Text>
                    </View>
                ) : sent.length === 0 ? (
                    <View style={styles.sheetEmptyWrap}>
                        <Text style={[styles.sheetEmptyTitle, { color: '#fff' }]}>No sent requests yet</Text>
                        <Text style={[styles.sheetEmptySubtitle, { color: '#94a3b8' }]}>Send a few likes in Discover and they’ll appear here.</Text>
                    </View>
                ) : (
                    <View style={styles.sheetCardsWrap}>
                        {sent.map((item) => {
                            const avatarUri = item.toUser.profilePhoto || item.toUser.image || item.toUser.profile?.photos?.[0] || null;
                            return (
                                <View key={item.swipeId} style={styles.sheetCardSent}>
                                    <View style={styles.sheetCardRow}>
                                        {avatarUri ? (
                                            <Image source={{ uri: avatarUri }} style={styles.sheetCardAvatar} resizeMode="cover" />
                                        ) : (
                                            <View style={[styles.sheetCardAvatar, styles.requestAvatarFallback, { borderColor: colors.border }]}>
                                                <Text style={[styles.requestAvatarInitial, { color: '#cbd5e1' }]}>
                                                    {(item.toUser.name || '?').trim().charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                        )}

                                        <View style={styles.sheetCardInfo}>
                                            <View style={styles.sheetCardInfoTop}>
                                                <Text style={styles.sheetCardName} numberOfLines={1}>{item.toUser.name}</Text>
                                                <Pressable
                                                    onPress={() => confirmCancelSent(item)}
                                                    style={({ pressed }) => ([styles.sheetCardCloseBtn, { opacity: pressed ? 0.75 : 1 }])}
                                                >
                                                    <X size={17} color="rgba(255,255,255,0.45)" />
                                                </Pressable>
                                            </View>

                                            <Text style={styles.sheetCardStatus} numberOfLines={1}>Status: Waiting...</Text>
                                            <Text style={styles.sheetCardMeta} numberOfLines={1}>{getSentMeta(item)}</Text>

                                            <View style={styles.sheetCardFooterRow}>
                                                <View style={styles.sheetMiniIconsRow}>
                                                    <Text style={styles.sheetCardMiniIcon}>💘</Text>
                                                    <Text style={styles.sheetCardMiniIcon}>💘</Text>
                                                </View>

                                                <Pressable
                                                    onPress={() => handleNudgeAgain(item)}
                                                    style={({ pressed }) => ([
                                                        styles.sheetNudgeBtn,
                                                        { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
                                                    ])}
                                                >
                                                    <Text style={styles.sheetNudgeText}>Nudge again?</Text>
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {nudgeNotice && (
                    <View style={styles.nudgeNoticeWrap}>
                        <Text style={styles.nudgeNoticeText}>{nudgeNotice}</Text>
                    </View>
                )}
                <Animated.View style={[styles.nudgeFlyPlane, nudgeFlyStyle]}>
                    <PaperPlaneTilt size={22} color="#f8e7b8" weight="fill" />
                </Animated.View>
            </ActivityHubSheet>

            <ActivityHubSheet
                visible={showIncomingSheet}
                onClose={handleCloseIncomingSheet}
                title="Incoming Likes"
                subtitle="People who liked your profile. Review and respond."
                isDark={isDark}
            >
                {isRequestsLoading ? (
                    <View style={styles.sheetLoadingWrap}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={[styles.sheetLoadingText, { color: '#94a3b8' }]}>Loading incoming likes…</Text>
                    </View>
                ) : visibleRequests.length === 0 ? (
                    <View style={styles.sheetEmptyWrap}>
                        <Text style={[styles.sheetEmptyTitle, { color: '#fff' }]}>No incoming likes yet</Text>
                        <Text style={[styles.sheetEmptySubtitle, { color: '#94a3b8' }]}>Keep your profile active to attract more likes.</Text>
                    </View>
                ) : (
                    <View style={styles.sheetCardsWrap}>
                        {visibleRequests.map((r) => {
                            const avatarUri = r.fromUser.profilePhoto || r.fromUser.image || r.fromUser.profile?.photos?.[0] || null;
                            return (
                                <View key={r.requestId} style={styles.sheetCardIncoming}>
                                    <View style={styles.sheetCardRow}>
                                        {avatarUri ? (
                                            <Image source={{ uri: avatarUri }} style={styles.sheetCardAvatar} resizeMode="cover" />
                                        ) : (
                                            <LinearGradient
                                                colors={['#ec4899', '#f43f5e']}
                                                style={[styles.sheetCardAvatar, { alignItems: 'center', justifyContent: 'center' }]}
                                            >
                                                <Text style={[styles.requestAvatarInitial, { color: '#fff' }]}> 
                                                    {(r.fromUser.name || '?').trim().charAt(0).toUpperCase()}
                                                </Text>
                                            </LinearGradient>
                                        )}

                                        <View style={styles.sheetCardInfo}>
                                            <View style={styles.sheetCardInfoTop}>
                                                <Text style={styles.sheetCardName} numberOfLines={1}>{r.fromUser.name}</Text>
                                                <Text style={styles.sheetTimeTag}>{getTimeAgo(r.createdAt)}</Text>
                                            </View>

                                            <Text style={styles.sheetCardStatus} numberOfLines={1}>Status: Wants to connect</Text>
                                            <Text style={styles.sheetCardMeta} numberOfLines={1}>{getRequestMeta(r)}</Text>

                                            <View style={styles.sheetIncomingActions}>
                                                <Pressable
                                                    onPress={() => handleDeclineRequest(r)}
                                                    disabled={respondMutation.isPending}
                                                    style={({ pressed }) => ([
                                                        styles.sheetDeclineBtn,
                                                        {
                                                            opacity: respondMutation.isPending ? 0.6 : (pressed ? 0.88 : 1),
                                                            transform: [{ scale: pressed ? 0.985 : 1 }],
                                                        },
                                                    ])}
                                                >
                                                    <Text style={styles.sheetDeclineText}>Decline</Text>
                                                </Pressable>

                                                <Pressable
                                                    onPress={() => handleAcceptRequest(r)}
                                                    disabled={respondMutation.isPending}
                                                    style={({ pressed }) => ([
                                                        styles.sheetAcceptWrap,
                                                        respondMutation.isPending && { opacity: 0.6 },
                                                        !respondMutation.isPending && { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
                                                    ])}
                                                >
                                                    <LinearGradient
                                                        colors={['#ec4899', '#f43f5e']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={styles.sheetAcceptBtn}
                                                    >
                                                        <Heart size={14} color="#fff" weight="fill" />
                                                        <Text style={styles.sheetAcceptText}>Accept</Text>
                                                    </LinearGradient>
                                                </Pressable>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
            </ActivityHubSheet>

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
        gap: 8,
        paddingBottom: 4,
    },
    connectionSpacesWrap: {
        paddingHorizontal: 16,
        gap: 12,
        paddingBottom: 4,
    },
    connectionSpacesHeader: {
        gap: 4,
    },
    connectionSpacesTitle: {
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.1,
    },
    connectionSpacesCaption: {
        fontSize: 12,
        fontWeight: '500',
    },
    activityHubContainer: {
        borderWidth: 1,
        borderRadius: 22,
        padding: 14,
        gap: 10,
    },
    activityHubTitle: {
        textAlign: 'center',
        fontSize: 26,
        fontWeight: '800',
        lineHeight: 32,
        color: '#fff',
        marginBottom: 4,
    },
    activityHubRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
    },
    activityCardCol: {
        flex: 1,
        maxWidth: '50%',
    },
    activityCard: {
        width: '100%',
        borderWidth: 1,
        borderRadius: 18,
        padding: 14,
        flexDirection: 'column',
        height: 248,
    },
    activityCardGold: {
        backgroundColor: 'rgba(236,202,120,0.08)',
        borderColor: 'rgba(236,202,120,0.55)',
    },
    activityCardPink: {
        backgroundColor: 'rgba(244,63,94,0.08)',
        borderColor: 'rgba(244,63,94,0.55)',
    },
    activityCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 28,
    },
    activityCardTagGold: {
        fontSize: 13,
        fontWeight: '800',
        color: '#d4b57f',
    },
    activityCardTagPink: {
        fontSize: 13,
        fontWeight: '800',
        color: '#f472b6',
    },
    activityCountBadgeGold: {
        minWidth: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#e9d08d',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    activityCountBadgePink: {
        minWidth: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f43f5e',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
    activityCountTextDark: {
        fontSize: 13,
        fontWeight: '800',
        color: '#1d1429',
    },
    activityCountTextLight: {
        fontSize: 13,
        fontWeight: '800',
        color: '#fff',
    },
    activityCardContent: {
        flexDirection: 'column',
        flex: 1,
        paddingTop: 12,
    },
    activityEmojiWrap: {
        height: 40,
        justifyContent: 'center',
        marginBottom: 6,
    },
    activityEmoji: {
        fontSize: 30,
        lineHeight: 34,
    },
    activityCardTitle: {
        fontSize: 17,
        fontWeight: '800',
        lineHeight: 22,
        color: '#fff',
        marginBottom: 4,
        minHeight: 44,
    },
    activityCardSubtitle: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        color: '#c8bfd6',
        minHeight: 36,
    },
    activityCtaGold: {
        marginTop: 'auto',
        backgroundColor: 'rgba(236,202,120,0.22)',
        borderWidth: 1,
        borderColor: 'rgba(236,202,120,0.45)',
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
    },
    activityCtaPink: {
        marginTop: 'auto',
        backgroundColor: 'rgba(244,63,94,0.22)',
        borderWidth: 1,
        borderColor: 'rgba(244,63,94,0.45)',
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
        height: 40,
    },
    activityCtaTextDark: {
        fontSize: 16,
        fontWeight: '800',
        color: '#f8e7b8',
    },
    activityCtaTextLight: {
        fontSize: 16,
        fontWeight: '800',
        color: '#ffd7e2',
    },
    heartEmptyHint: {
        marginTop: 2,
        marginBottom: 8,
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    heartEmptyHintTitle: {
        fontSize: 16,
        lineHeight: 21,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
    },
    heartEmptyHintSubtitle: {
        marginTop: 4,
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        color: '#a9a1b8',
        textAlign: 'center',
    },
    messagePreviewSection: {
        borderWidth: 1,
        borderRadius: 18,
        paddingVertical: 10,
    },
    messagePreviewHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    messagePreviewTitle: {
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '800',
        color: '#fff',
    },
    messagePreviewCount: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        textAlign: 'center',
        textAlignVertical: 'center',
        overflow: 'hidden',
        fontSize: 12,
        lineHeight: 24,
        fontWeight: '800',
        color: '#1d1429',
        backgroundColor: '#e9d08d',
        paddingHorizontal: 8,
    },
    messagePreviewEmpty: {
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    messagePreviewEmptyText: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
        color: '#9f96b4',
    },
    messagePreviewScroll: {
        paddingHorizontal: 12,
        gap: 10,
    },
    messagePreviewCard: {
        width: 228,
        borderRadius: 14,
        borderWidth: 1,
        padding: 10,
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
    },
    messagePreviewAvatar: {
        width: 46,
        height: 46,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    messagePreviewTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
        gap: 6,
    },
    messagePreviewName: {
        flex: 1,
        fontSize: 13,
        lineHeight: 17,
        fontWeight: '700',
        color: '#fff',
    },
    messagePreviewTime: {
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '600',
        color: '#9f96b4',
    },
    messagePreviewText: {
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
        color: '#c8bfd6',
    },

    activitySheetRoot: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    activitySheetBackdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    activitySheet: {
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        borderWidth: 1,
        height: '85%',
        paddingTop: 10,
    },
    activitySheetHandle: {
        alignSelf: 'center',
        width: 44,
        height: 5,
        borderRadius: 999,
        marginBottom: 10,
    },
    activitySheetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        paddingHorizontal: 16,
        marginBottom: 10,
    },
    activitySheetBackBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    activitySheetTitle: {
        fontSize: 30,
        fontWeight: '800',
        lineHeight: 34,
        letterSpacing: -0.5,
    },
    activitySheetSubtitle: {
        marginTop: 3,
        fontSize: 14,
        lineHeight: 19,
        fontWeight: '500',
    },
    activitySheetContent: {
        paddingHorizontal: 16,
        paddingBottom: 32,
        gap: 14,
    },
    sheetLoadingWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 42,
        gap: 12,
    },
    sheetLoadingText: {
        fontSize: 13,
        fontWeight: '600',
    },
    sheetEmptyWrap: {
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderRadius: 20,
        paddingVertical: 26,
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    sheetEmptyTitle: {
        fontSize: 18,
        lineHeight: 23,
        fontWeight: '800',
    },
    sheetEmptySubtitle: {
        marginTop: 6,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
        textAlign: 'center',
    },
    sheetCardsWrap: {
        gap: 12,
    },
    sheetCardSent: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(236,202,120,0.5)',
        backgroundColor: 'rgba(236,202,120,0.08)',
        padding: 11,
    },
    sheetCardIncoming: {
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(244,63,94,0.45)',
        backgroundColor: 'rgba(244,63,94,0.08)',
        padding: 11,
    },
    sheetCardRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        gap: 10,
    },
    sheetCardInfo: {
        flex: 1,
        justifyContent: 'space-between',
        minHeight: 108,
    },
    sheetCardInfoTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 6,
    },
    sheetCardAvatar: {
        width: 92,
        height: 124,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.07)',
    },
    sheetCardName: {
        flex: 1,
        fontSize: 20,
        lineHeight: 24,
        fontWeight: '800',
        color: '#fff',
    },
    sheetCardStatus: {
        marginTop: 4,
        fontSize: 14,
        lineHeight: 18,
        fontWeight: '500',
        color: '#cfc6dc',
    },
    sheetCardMeta: {
        marginTop: 3,
        fontSize: 12,
        lineHeight: 16,
        fontWeight: '500',
        color: '#a59ab8',
    },
    sheetCardMiniIcon: {
        fontSize: 13,
        lineHeight: 14,
    },
    sheetMiniIconsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sheetCardFooterRow: {
        marginTop: 8,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    sheetCardCloseBtn: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sheetNudgeBtn: {
        height: 36,
        minWidth: 128,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(236,202,120,0.86)',
        backgroundColor: 'rgba(236,202,120,0.24)',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#e9d08d',
        shadowOpacity: 0.45,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
    },
    sheetNudgeText: {
        fontSize: 14,
        lineHeight: 16,
        fontWeight: '800',
        color: '#f8e7b8',
    },
    sheetTimeTag: {
        fontSize: 11,
        lineHeight: 14,
        fontWeight: '700',
        color: '#fda4af',
    },
    sheetIncomingActions: {
        marginTop: 8,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
    },
    sheetDeclineBtn: {
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.14)',
        backgroundColor: 'rgba(255,255,255,0.06)',
        minWidth: 82,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        height: 36,
    },
    sheetDeclineText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#b8aec7',
    },
    sheetAcceptWrap: {
        borderRadius: 999,
        overflow: 'hidden',
        minWidth: 118,
    },
    sheetAcceptBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 36,
        paddingHorizontal: 14,
        borderRadius: 999,
    },
    sheetAcceptText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#fff',
    },
    nudgeNoticeWrap: {
        marginTop: 4,
        marginBottom: 2,
        borderRadius: 12,
        paddingVertical: 9,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(236,202,120,0.45)',
        backgroundColor: 'rgba(236,202,120,0.12)',
    },
    nudgeNoticeText: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '700',
        color: '#f8e7b8',
        textAlign: 'center',
    },
    nudgeFlyPlane: {
        position: 'absolute',
        top: 12,
        left: 0,
    },

    // Requests
    requestsContainer: {
        paddingBottom: 2,
        gap: 10,
    },

    // Sent
    sentContainer: {
        paddingBottom: 2,
        gap: 8,
    },
    spaceCard: {
        borderWidth: 1,
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    spaceCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    spaceIconWrap: {
        width: 34,
        height: 34,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    spaceIcon: {
        fontSize: 17,
    },
    spaceTitleGroup: {
        flex: 1,
    },
    spaceCardTitle: {
        fontSize: 17,
        fontWeight: '800',
        lineHeight: 22,
    },
    spaceCardSubtitle: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 18,
        marginTop: 2,
    },
    spaceBody: {
        marginTop: 8,
        borderWidth: 1,
        borderRadius: 14,
        paddingVertical: 8,
    },
    spaceEmptyBlock: {
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
    },
    spaceEmptyTitle: {
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },
    spaceEmptySubtitle: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 17,
    },
    spaceHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    spaceSubtitle: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 2,
    },
    sentCollapseHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 2,
    },
    sentCollapseRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sentStripOuter: {
        marginHorizontal: -16,
    },
    sentStripLoading: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 2,
    },
    sectionEmptyInline: {
        borderRadius: 12,
        borderWidth: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        alignItems: 'center',
    },
    sectionEmptyInlineText: {
        fontSize: 12,
        fontWeight: '600',
        textAlign: 'center',
        color: '#94a3b8',
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
