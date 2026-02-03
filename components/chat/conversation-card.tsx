import React from 'react';
import { View, Pressable, StyleSheet, Alert, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { Match, getRelativeTime, getLastActiveStatus } from '@/hooks/use-matches';
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
import { Archive, BellSlash, Bell } from 'phosphor-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = 80;
const ACTION_WIDTH = 160;

interface ConversationCardProps {
    match: Match;
    onPress: (match: Match) => void;
    onArchive?: (match: Match) => void;
    onDelete?: (match: Match) => void;
    onMute?: (match: Match) => void;
    isMuted?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ConversationCard({ match, onPress, onArchive, onDelete, onMute, isMuted = false }: ConversationCardProps) {
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
    const lastMessageText = match.lastMessage?.content || 'Start a conversation';
    const lastMessageTime = match.lastMessage?.createdAt
        ? getRelativeTime(match.lastMessage.createdAt)
        : getRelativeTime(match.createdAt);

    const unreadCount = match.unreadCount || 0;
    const hasUnread = unreadCount > 0;
    const { text: activeStatus, isOnline } = getLastActiveStatus(match.partner.lastActive);

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

    const handleDelete = () => {
        Alert.alert(
            'Delete Conversation',
            `Are you sure you want to delete your conversation with ${partnerName}? This cannot be undone.`,
            [
                { 
                    text: 'Cancel', 
                    style: 'cancel',
                    onPress: () => {
                        translateX.value = withSpring(0);
                    }
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                        translateX.value = withTiming(-SCREEN_WIDTH, {}, () => {
                            if (onDelete) runOnJS(onDelete)(match);
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
                    text: isMuted ? 'Unmute Notifications' : 'Mute Notifications',
                    onPress: () => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        onMute?.(match);
                    },
                },
                {
                    text: 'Archive Chat',
                    onPress: () => {
                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                        onArchive?.(match);
                    },
                },
                {
                    text: 'Delete Chat',
                    style: 'destructive',
                    onPress: handleDelete,
                },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    };

    const panGesture = Gesture.Pan()
        .activeOffsetX([-10, 10])
        .onUpdate((event) => {
            if (event.translationX < 0) {
                translateX.value = Math.max(event.translationX, -ACTION_WIDTH);
            } else if (translateX.value < 0) {
                translateX.value = Math.min(0, translateX.value + event.translationX);
            }
        })
        .onEnd((event) => {
            if (event.translationX < -SWIPE_THRESHOLD || translateX.value < -SWIPE_THRESHOLD) {
                translateX.value = withSpring(-ACTION_WIDTH, { damping: 20, stiffness: 300 });
                runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
            } else {
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
            {/* Swipe Actions */}
            <Animated.View style={[styles.actionsContainer, actionsStyle]}>
                <Pressable
                    style={[styles.actionButton, isMuted ? styles.unmuteButton : styles.muteButton]}
                    onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        translateX.value = withSpring(0);
                        onMute?.(match);
                    }}
                >
                    {isMuted ? (
                        <Bell size={20} color="#fff" weight="bold" />
                    ) : (
                        <BellSlash size={20} color="#fff" weight="bold" />
                    )}
                    <Text style={styles.actionText}>{isMuted ? 'Unmute' : 'Mute'}</Text>
                </Pressable>
                <Pressable
                    style={[styles.actionButton, styles.archiveButton]}
                    onPress={handleArchive}
                >
                    <Archive size={20} color="#fff" weight="bold" />
                    <Text style={styles.actionText}>Archive</Text>
                </Pressable>
            </Animated.View>

            {/* Main Card */}
            <GestureDetector gesture={panGesture}>
                <AnimatedPressable
                    style={[
                        styles.card,
                        {
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff',
                            borderColor: hasUnread 
                                ? 'rgba(236, 72, 153, 0.3)' 
                                : (isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'),
                        },
                        cardStyle,
                    ]}
                    onPress={handlePress}
                    onLongPress={handleLongPress}
                    delayLongPress={400}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    {/* Avatar */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            {avatarUri ? (
                                <CachedImage uri={avatarUri} style={styles.avatar} fallbackType="avatar" />
                            ) : (
                                <LinearGradient
                                    colors={['#ec4899', '#f43f5e']}
                                    style={styles.avatarPlaceholder}
                                >
                                    <Text style={styles.avatarInitial}>{initial}</Text>
                                </LinearGradient>
                            )}
                            {/* Online indicator */}
                            {isOnline && (
                                <View style={[styles.onlineIndicator, { borderColor: isDark ? '#0f0d23' : '#fff' }]}>
                                    <View style={styles.onlineDot} />
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Content */}
                    <View style={styles.contentSection}>
                        <View style={styles.topRow}>
                            <View style={styles.nameContainer}>
                                <Text
                                    style={[
                                        styles.name,
                                        { color: isDark ? '#fff' : '#1a1a2e' },
                                        hasUnread && styles.nameBold,
                                    ]}
                                    numberOfLines={1}
                                    ellipsizeMode="tail"
                                >
                                    {partnerName}
                                </Text>
                                {isMuted && (
                                    <BellSlash size={14} color={isDark ? '#64748b' : '#9ca3af'} weight="bold" style={{ marginLeft: 6 }} />
                                )}
                                {!isOnline && (
                                    <Text style={[styles.activeStatus, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                                        · {activeStatus}
                                    </Text>
                                )}
                            </View>
                            <Text style={[styles.time, { color: hasUnread ? '#ec4899' : (isDark ? '#64748b' : '#9ca3af') }]}>
                                {lastMessageTime}
                            </Text>
                        </View>

                        <View style={styles.bottomRow}>
                            <Text
                                style={[
                                    styles.preview,
                                    {
                                        color: hasUnread 
                                            ? (isDark ? '#fff' : '#1a1a2e') 
                                            : (isDark ? '#94a3b8' : '#6b7280'),
                                    },
                                    hasUnread && styles.previewBold,
                                ]}
                                numberOfLines={1}
                            >
                                {lastMessageText}
                            </Text>
                            {hasUnread && (
                                <View style={styles.unreadBadge}>
                                    <Text style={styles.unreadText}>
                                        {unreadCount > 99 ? '99+' : unreadCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                </AnimatedPressable>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginHorizontal: 16,
        marginVertical: 4,
    },
    actionsContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: ACTION_WIDTH,
        flexDirection: 'row',
        borderRadius: 16,
        overflow: 'hidden',
    },
    actionButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 4,
    },
    muteButton: {
        backgroundColor: '#6366f1',
    },
    unmuteButton: {
        backgroundColor: '#f59e0b',
    },
    archiveButton: {
        backgroundColor: '#10b981',
    },
    actionText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        gap: 12,
    },
    avatarSection: {
        position: 'relative',
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10b981',
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    contentSection: {
        flex: 1,
        gap: 4,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    nameContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 8,
    },
    name: {
        fontSize: 16,
        fontWeight: '500',
        flexShrink: 1,
    },
    nameBold: {
        fontWeight: '700',
    },
    activeStatus: {
        fontSize: 13,
        marginLeft: 4,
        flexShrink: 0,
    },
    time: {
        fontSize: 13,
        fontWeight: '500',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    preview: {
        flex: 1,
        fontSize: 14,
        marginRight: 8,
    },
    previewBold: {
        fontWeight: '600',
    },
    unreadBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#ec4899',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    unreadText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
});
