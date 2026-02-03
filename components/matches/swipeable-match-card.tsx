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
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SwipeableMatchCard({ match, onPress, onArchive, onUnmatch }: SwipeableMatchCardProps) {
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
                            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.06)' : '#ffffff',
                            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
                        },
                        cardStyle,
                    ]}
                    onPress={handlePress}
                    onLongPress={handleLongPress}
                    delayLongPress={400}
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    {/* Avatar Section */}
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

                        {/* Unread badge */}
                        {hasUnread && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadText}>
                                    {unreadCount > 99 ? '99+' : unreadCount}
                                </Text>
                            </View>
                        )}
                        
                        {/* NEW badge for unopened matches */}
                        {isNew && !hasUnread && (
                            <View style={styles.newBadge}>
                                <Text style={styles.newBadgeText}>NEW</Text>
                            </View>
                        )}
                    </View>

                    {/* Content Section */}
                    <View style={styles.contentSection}>
                        {/* Top row: Name + Time */}
                        <View style={styles.topRow}>
                            <Text
                                style={[styles.name, { color: isDark ? '#fff' : '#1a1a2e' }]}
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

                        {/* Status row */}
                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusBadge,
                                { backgroundColor: isOnline ? 'rgba(16, 185, 129, 0.15)' : (isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)') }
                            ]}>
                                <View style={[
                                    styles.statusDot,
                                    { backgroundColor: isOnline ? '#10b981' : '#64748b' }
                                ]} />
                                <Text style={[
                                    styles.statusText,
                                    { color: isOnline ? '#10b981' : (isDark ? '#64748b' : '#9ca3af') }
                                ]}>
                                    {activeStatus}
                                </Text>
                            </View>
                        </View>

                        {/* Message preview or icebreaker */}
                        {lastMessageText ? (
                            <Text
                                style={[
                                    styles.preview,
                                    {
                                        color: hasUnread ? (isDark ? '#fff' : '#1a1a2e') : (isDark ? '#94a3b8' : '#6b7280'),
                                        fontWeight: hasUnread ? '600' : '400',
                                    }
                                ]}
                                numberOfLines={1}
                            >
                                {lastMessageText}
                            </Text>
                        ) : (
                            <View
                                style={[
                                    styles.icebreaker,
                                    { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }
                                ]}
                            >
                                <Text style={styles.icebreakerText}>Say hi! 👋</Text>
                            </View>
                        )}

                        {/* Spark score + interests */}
                        <View style={styles.bottomRow}>
                            <LinearGradient
                                colors={['#ec4899', '#f43f5e']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.sparkBadge}
                            >
                                <Ionicons name="sparkles" size={11} color="#fff" />
                                <Text style={styles.sparkText}>{sparkScore}%</Text>
                            </LinearGradient>

                            {interests.length > 0 && (
                                <View style={styles.interestsContainer}>
                                    {interests.map((interest, idx) => (
                                        <View
                                            key={idx}
                                            style={[
                                                styles.interestBadge,
                                                { backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)' }
                                            ]}
                                        >
                                            <Text 
                                                style={[styles.interestText, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                                                numberOfLines={1}
                                            >
                                                {interest}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Chevron */}
                    <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={isDark ? '#4a5568' : '#cbd5e0'}
                        style={styles.chevron}
                    />
                </AnimatedPressable>
            </GestureDetector>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
        marginHorizontal: 16,
        marginVertical: 6,
    },
    actionsContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: ACTION_WIDTH,
        flexDirection: 'row',
        borderRadius: 20,
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
        padding: 14,
        borderRadius: 20,
        borderWidth: 1,
        minHeight: 100,
    },
    avatarSection: {
        position: 'relative',
        marginRight: 12,
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
        bottom: 0,
        right: 0,
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#10b981',
    },
    onlineDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10b981',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
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
        fontWeight: '700',
    },
    newBadge: {
        position: 'absolute',
        top: -6,
        right: -8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: '#8b5cf6', // Purple for "new" to differentiate from unread
    },
    newBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    contentSection: {
        flex: 1,
        marginRight: 4,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 3,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 8,
    },
    timeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    newDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ec4899',
    },
    time: {
        fontSize: 12,
        fontWeight: '500',
    },
    statusRow: {
        marginBottom: 4,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        gap: 4,
    },
    statusDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    preview: {
        fontSize: 13,
        lineHeight: 18,
        marginBottom: 6,
    },
    icebreaker: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        marginBottom: 6,
    },
    icebreakerText: {
        color: '#ec4899',
        fontSize: 12,
        fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sparkBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 8,
        gap: 3,
    },
    sparkText: {
        color: '#fff',
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
