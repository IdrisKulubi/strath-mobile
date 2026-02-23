import React from 'react';
import { View, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { Match, getRelativeTime, getLastActiveStatus } from '@/hooks/use-matches';
import { type Mission } from '@/hooks/use-missions';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
    Extrapolation,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Archive, HeartBreak } from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 160; // Width for both buttons

interface SwipeableMatchCardProps {
    match: Match;
    onPress: (match: Match) => void;
    onArchive?: (match: Match) => void;
    onUnmatch?: (match: Match) => void;
    mission?: Mission | null;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SwipeableMatchCard({ match, onPress, onArchive, onUnmatch, mission }: SwipeableMatchCardProps) {
    const { isDark } = useTheme();
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);

    // Get display info
    const partnerName = match.partner.name ||
        (match.partner.profile?.firstName
            ? `${match.partner.profile.firstName} ${match.partner.profile.lastName || ''}`.trim()
            : 'Unknown');

    const avatarUri = match.partner.image ||
        match.partner.profile?.profilePhoto ||
        (match.partner.profile?.photos?.[0]);

    const initial = partnerName.charAt(0).toUpperCase();
    const lastMessageText = match.lastMessage?.content || null;
    const lastMessageTime = match.lastMessage?.createdAt
        ? getRelativeTime(match.lastMessage.createdAt)
        : getRelativeTime(match.createdAt);

    const unreadCount = match.unreadCount || 0;
    const hasUnread = unreadCount > 0;
    const isNew = match.isNew === true; // Whether this is a new/unopened match
    const sparkScore = match.sparkScore || 70;
    const { text: activeStatus, isOnline } = getLastActiveStatus(match.partner.lastActive);
    const interests = match.partner.profile?.interests?.slice(0, 2) || [];

    const handlePress = () => {
        if (Math.abs(translateX.value) < 10) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(match);
        }
    };

    const handleArchive = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        translateX.value = withTiming(0);
        onArchive?.(match);
    };

    const handleUnmatch = () => {
        Alert.alert(
            'Unmatch',
            `Are you sure you want to unmatch with ${partnerName}? This will delete your conversation.`,
            [
                { 
                    text: 'Cancel', 
                    style: 'cancel',
                    onPress: () => {
                        translateX.value = withSpring(0);
                    }
                },
                {
                    text: 'Unmatch',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        translateX.value = withTiming(-SCREEN_WIDTH, {}, () => {
                            runOnJS(onUnmatch!)(match);
                        });
                    },
                },
            ]
        );
    };

    const handlePressIn = () => {
        if (translateX.value === 0) {
            scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const handleLongPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            partnerName,
            'What would you like to do?',
            [
                {
                    text: 'Archive Chat',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onArchive?.(match);
                    },
                },
                {
                    text: 'Unmatch',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Unmatch',
                            `Are you sure you want to unmatch with ${partnerName}? This will delete your conversation.`,
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Unmatch',
                                    style: 'destructive',
                                    onPress: () => {
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                                        onUnmatch?.(match);
                                    },
                                },
                            ]
                        );
                    },
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            // Only allow swiping left (negative direction)
            if (event.translationX < 0) {
                translateX.value = Math.max(event.translationX, -ACTION_WIDTH);
            } else if (translateX.value < 0) {
                // Allow swiping back to close
                translateX.value = Math.min(0, translateX.value + event.translationX);
            }
        })
        .onEnd((event) => {
            if (event.translationX < -SWIPE_THRESHOLD || translateX.value < -SWIPE_THRESHOLD) {
                // Snap to show actions
                translateX.value = withSpring(-ACTION_WIDTH, { damping: 20, stiffness: 300 });
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            } else {
                // Snap back
                translateX.value = withSpring(0, { damping: 20, stiffness: 300 });
            }
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { scale: scale.value },
        ],
    }));

    const actionsStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [-ACTION_WIDTH, -SWIPE_THRESHOLD, 0],
            [1, 0.8, 0],
            Extrapolation.CLAMP
        ),
    }));

    return (
        <View style={styles.container}>
            {/* Swipe Actions (behind the card) */}
            <Animated.View style={[styles.actionsContainer, actionsStyle]}>
                <Pressable
                    style={[styles.actionButton, styles.archiveButton]}
                    onPress={handleArchive}
                >
                    <Archive size={22} color="#fff" weight="bold" />
                    <Text style={styles.actionText}>Archive</Text>
                </Pressable>
                <Pressable
                    style={[styles.actionButton, styles.unmatchButton]}
                    onPress={handleUnmatch}
                >
                    <HeartBreak size={22} color="#fff" weight="bold" />
                    <Text style={styles.actionText}>Unmatch</Text>
                </Pressable>
            </Animated.View>

            {/* Main Card */}
            <GestureDetector gesture={panGesture}>
                <AnimatedPressable
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#ffffff',
                            borderColor: (hasUnread || isNew)
                                ? (isDark ? 'rgba(236,72,153,0.30)' : 'rgba(236,72,153,0.22)')
                                : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'),
                        },
                        cardStyle,
                    ]}
                    onPress={handlePress}
                    onLongPress={handleLongPress}
                    delayLongPress={400}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    {/* New-match left accent stripe */}
                    {(hasUnread || isNew) && (
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0, y: 1 }}
                            style={styles.accentStripe}
                        />
                    )}

                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        {/* Gradient ring for active/new matches */}
                        {(hasUnread || isNew) ? (
                            <LinearGradient
                                colors={['#ec4899', '#f43f5e']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.avatarRing}
                            >
                                <View style={[styles.avatarRingInner, { backgroundColor: isDark ? 'rgba(15,13,35,1)' : '#fff' }]}>
                                    {avatarUri ? (
                                        <CachedImage uri={avatarUri} style={styles.avatar} fallbackType="avatar" />
                                    ) : (
                                        <LinearGradient colors={['#ec4899', '#f43f5e']} style={styles.avatarPlaceholder}>
                                            <Text style={styles.avatarInitial}>{initial}</Text>
                                        </LinearGradient>
                                    )}
                                </View>
                            </LinearGradient>
                        ) : (
                            <View style={styles.avatarWrapper}>
                                {avatarUri ? (
                                    <CachedImage uri={avatarUri} style={styles.avatar} fallbackType="avatar" />
                                ) : (
                                    <LinearGradient colors={['#ec4899', '#f43f5e']} style={styles.avatarPlaceholder}>
                                        <Text style={styles.avatarInitial}>{initial}</Text>
                                    </LinearGradient>
                                )}
                            </View>
                        )}

                        {/* Online dot */}
                        {isOnline && (
                            <View style={[styles.onlineIndicator, { borderColor: isDark ? '#0f0d23' : '#fff' }]} />
                        )}

                        {/* Unread count */}
                        {hasUnread && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                            </View>
                        )}
                    </View>

                    {/* Content */}
                    <View style={styles.contentSection}>
                        {/* Row 1: Name + time */}
                        <View style={styles.topRow}>
                            <Text
                                style={[
                                    styles.name,
                                    {
                                        color: isDark ? '#fff' : '#1a1a2e',
                                        fontWeight: (hasUnread || isNew) ? '700' : '600',
                                    },
                                ]}
                                numberOfLines={1}
                                ellipsizeMode="tail"
                            >
                                {partnerName}
                            </Text>
                            <View style={styles.timeContainer}>
                                {hasUnread && <View style={styles.newDot} />}
                                <Text style={[styles.time, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                                    {lastMessageTime}
                                </Text>
                            </View>
                        </View>

                        {/* Row 2: Message preview / icebreaker */}
                        {lastMessageText ? (
                            <Text
                                style={[
                                    styles.preview,
                                    {
                                        color: hasUnread ? (isDark ? '#e2e8f0' : '#334155') : (isDark ? '#64748b' : '#9ca3af'),
                                        fontWeight: hasUnread ? '500' : '400',
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {lastMessageText}
                            </Text>
                        ) : (
                            <View style={[styles.icebreaker, { backgroundColor: isDark ? 'rgba(236,72,153,0.12)' : 'rgba(236,72,153,0.08)' }]}>
                                <Text style={styles.icebreakerText}>Say hi! 👋</Text>
                            </View>
                        )}

                        {/* Row 3: status + mission chip */}
                        <View style={styles.bottomRow}>
                            {isOnline && (
                                <View style={[styles.onlinePill, { backgroundColor: isDark ? 'rgba(16,185,129,0.12)' : 'rgba(16,185,129,0.08)' }]}>
                                    <View style={styles.onlinePillDot} />
                                    <Text style={styles.onlinePillText}>Online</Text>
                                </View>
                            )}
                            {mission && mission.status !== 'completed' && mission.status !== 'expired' && mission.status !== 'skipped' && (
                                <View style={[styles.missionBadge, { backgroundColor: isDark ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.10)' }]}>
                                    <Text style={styles.missionBadgeText}>
                                        {mission.emoji} {mission.status === 'accepted' ? 'In progress' : 'Mission'}
                                    </Text>
                                </View>
                            )}
                            {!isOnline && !mission && interests.length > 0 && (
                                <View style={styles.interestsContainer}>
                                    {interests.slice(0, 2).map((interest, idx) => (
                                        <View
                                            key={idx}
                                            style={[styles.interestBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}
                                        >
                                            <Text style={[styles.interestText, { color: isDark ? '#94a3b8' : '#6b7280' }]} numberOfLines={1}>
                                                {interest}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Chevron */}
                    <Ionicons name="chevron-forward" size={16} color={isDark ? '#3d4d60' : '#d1d5db'} style={styles.chevron} />
                </AnimatedPressable>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginHorizontal: 16,
        marginVertical: 5,
    },
    actionsContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: ACTION_WIDTH,
        flexDirection: 'row',
        borderRadius: 22,
        overflow: 'hidden',
    },
    actionButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    archiveButton: {
        backgroundColor: '#10b981',
    },
    unmatchButton: {
        backgroundColor: '#ef4444',
    },
    actionText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 13,
        paddingRight: 14,
        paddingLeft: 18,
        borderRadius: 22,
        borderWidth: 1,
        minHeight: 90,
        overflow: 'hidden',
    },
    // Left accent stripe for unread/new
    accentStripe: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        borderTopLeftRadius: 22,
        borderBottomLeftRadius: 22,
    },

    // Avatar
    avatarSection: {
        position: 'relative',
        marginRight: 14,
    },
    avatarWrapper: { position: 'relative' },
    avatarRing: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 2.5,
    },
    avatarRingInner: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        overflow: 'hidden',
    },
    avatar: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
    },
    avatarPlaceholder: {
        width: 65,
        height: 65,
        borderRadius: 32.5,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        backgroundColor: '#10b981',
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ec4899',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 5,
    },
    unreadText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '800',
    },

    // Content
    contentSection: {
        flex: 1,
        marginRight: 4,
        gap: 3,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    name: {
        fontSize: 16,
        flex: 1,
        marginRight: 8,
        letterSpacing: -0.2,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    newDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        backgroundColor: '#ec4899',
    },
    time: {
        fontSize: 12,
        fontWeight: '500',
    },
    preview: {
        fontSize: 13,
        lineHeight: 18,
    },
    icebreaker: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },
    icebreakerText: {
        color: '#ec4899',
        fontSize: 12,
        fontWeight: '600',
    },

    // Bottom row (status / mission / interests)
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 2,
    },
    onlinePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    onlinePillDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#10b981',
    },
    onlinePillText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#10b981',
    },
    missionBadge: {
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
    },
    missionBadgeText: {
        color: '#8b5cf6',
        fontSize: 11,
        fontWeight: '700',
    },
    interestsContainer: {
        flexDirection: 'row',
        gap: 4,
        flex: 1,
    },
    interestBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        maxWidth: 80,
    },
    interestText: {
        fontSize: 10,
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 4,
    },
});
