import React from 'react';
import { View, Pressable, StyleSheet, Image, Dimensions } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { Match, getRelativeTime, getLastActiveStatus } from '@/hooks/use-matches';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    interpolate,
    Extrapolation,
    runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;

interface RichMatchCardProps {
    match: Match;
    onPress: (match: Match) => void;
    onArchive?: (match: Match) => void;
    onUnmatch?: (match: Match) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function RichMatchCard({ match, onPress, onArchive, onUnmatch }: RichMatchCardProps) {
    const { isDark } = useTheme();
    const scale = useSharedValue(1);
    const translateX = useSharedValue(0);
    const isSwipeActive = useSharedValue(false);

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
    const sparkScore = match.sparkScore || 70;
    const { text: activeStatus, isOnline } = getLastActiveStatus(match.partner.lastActive);
    
    // Get shared interests (first 3)
    const interests = match.partner.profile?.interests?.slice(0, 3) || [];

    const handlePress = () => {
        if (Math.abs(translateX.value) < 10) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onPress(match);
        }
    };

    const handlePressIn = () => {
        if (!isSwipeActive.value) {
            scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
        }
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const triggerArchive = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onArchive?.(match);
    };

    const triggerUnmatch = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onUnmatch?.(match);
    };

    const panGesture = Gesture.Pan()
        .onStart(() => {
            isSwipeActive.value = true;
        })
        .onUpdate((event) => {
            translateX.value = event.translationX;
        })
        .onEnd((event) => {
            isSwipeActive.value = false;
            if (event.translationX > SWIPE_THRESHOLD && onArchive) {
                translateX.value = withSpring(SCREEN_WIDTH, {}, () => {
                    runOnJS(triggerArchive)();
                });
            } else if (event.translationX < -SWIPE_THRESHOLD && onUnmatch) {
                translateX.value = withSpring(-SCREEN_WIDTH, {}, () => {
                    runOnJS(triggerUnmatch)();
                });
            } else {
                translateX.value = withSpring(0);
            }
        });

    const cardStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: translateX.value },
            { scale: scale.value },
        ],
    }));

    const leftActionStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [0, SWIPE_THRESHOLD],
            [0, 1],
            Extrapolation.CLAMP
        ),
    }));

    const rightActionStyle = useAnimatedStyle(() => ({
        opacity: interpolate(
            translateX.value,
            [-SWIPE_THRESHOLD, 0],
            [1, 0],
            Extrapolation.CLAMP
        ),
    }));

    return (
        <View style={styles.container}>
            {/* Left swipe action - Archive */}
            <Animated.View style={[styles.swipeAction, styles.leftAction, leftActionStyle]}>
                <LinearGradient
                    colors={['#10b981', '#059669']}
                    style={styles.actionGradient}
                >
                    <Ionicons name="archive" size={24} color="#fff" />
                    <Text style={styles.actionText}>Archive</Text>
                </LinearGradient>
            </Animated.View>

            {/* Right swipe action - Unmatch */}
            <Animated.View style={[styles.swipeAction, styles.rightAction, rightActionStyle]}>
                <LinearGradient
                    colors={['#ef4444', '#dc2626']}
                    style={styles.actionGradient}
                >
                    <Ionicons name="heart-dislike" size={24} color="#fff" />
                    <Text style={styles.actionText}>Unmatch</Text>
                </LinearGradient>
            </Animated.View>

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
                    onPressIn={handlePressIn}
                    onPressOut={handlePressOut}
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            {avatarUri ? (
                                <Image source={{ uri: avatarUri }} style={styles.avatar} />
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
                                <View style={styles.onlineIndicator}>
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
                    </View>

                    {/* Content Section */}
                    <View style={styles.contentSection}>
                        {/* Top row: Name + Time */}
                        <View style={styles.topRow}>
                            <View style={styles.nameRow}>
                                <Text
                                    style={[styles.name, { color: isDark ? '#fff' : '#1a1a2e' }]}
                                    numberOfLines={1}
                                >
                                    {partnerName}
                                </Text>
                                {hasUnread && <View style={styles.newDot} />}
                            </View>
                            <Text style={[styles.time, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                                {lastMessageTime}
                            </Text>
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
                            <Pressable
                                style={[
                                    styles.icebreaker,
                                    { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }
                                ]}
                                onPress={handlePress}
                            >
                                <Text style={styles.icebreakerText}>Say hi! 👋</Text>
                            </Pressable>
                        )}

                        {/* Spark score + interests */}
                        <View style={styles.bottomRow}>
                            {/* Spark score */}
                            <View style={styles.sparkContainer}>
                                <LinearGradient
                                    colors={['#ec4899', '#f43f5e']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.sparkBadge}
                                >
                                    <Ionicons name="sparkles" size={12} color="#fff" />
                                    <Text style={styles.sparkText}>{sparkScore}%</Text>
                                </LinearGradient>
                                <Text style={[styles.sparkLabel, { color: isDark ? '#64748b' : '#9ca3af' }]}>
                                    spark
                                </Text>
                            </View>

                            {/* Interests */}
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
                                            <Text style={[styles.interestText, { color: isDark ? '#94a3b8' : '#6b7280' }]}>
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
                        size={20}
                        color={isDark ? '#64748b' : '#9ca3af'}
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
    swipeAction: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    leftAction: {
        left: 0,
    },
    rightAction: {
        right: 0,
    },
    actionGradient: {
        flex: 1,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 20,
        gap: 4,
    },
    actionText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        minHeight: 120,
    },
    avatarSection: {
        position: 'relative',
        marginRight: 14,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 68,
        height: 68,
        borderRadius: 34,
    },
    avatarPlaceholder: {
        width: 68,
        height: 68,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '700',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#0f0d23',
        justifyContent: 'center',
        alignItems: 'center',
    },
    onlineDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#10b981',
    },
    unreadBadge: {
        position: 'absolute',
        top: -4,
        right: -4,
        minWidth: 22,
        height: 22,
        borderRadius: 11,
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
    contentSection: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    name: {
        fontSize: 17,
        fontWeight: '600',
    },
    newDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#ec4899',
    },
    time: {
        fontSize: 13,
        fontWeight: '500',
    },
    statusRow: {
        marginBottom: 6,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        gap: 4,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    preview: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    icebreaker: {
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        marginBottom: 8,
    },
    icebreakerText: {
        color: '#ec4899',
        fontSize: 13,
        fontWeight: '600',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    sparkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sparkBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        gap: 3,
    },
    sparkText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    sparkLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    interestsContainer: {
        flexDirection: 'row',
        gap: 6,
        flex: 1,
        flexWrap: 'wrap',
    },
    interestBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    interestText: {
        fontSize: 11,
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 8,
    },
});
