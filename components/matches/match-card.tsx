import React from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { Match, getRelativeTime, getLastActiveStatus } from '@/hooks/use-matches';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface MatchCardProps {
    match: Match;
    onPress: (match: Match) => void;
    onArchive?: (match: Match) => void;
    onUnmatch?: (match: Match) => void;
    showOptions?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MatchCard({ match, onPress, onArchive, onUnmatch, showOptions = true }: MatchCardProps) {
    const { isDark } = useTheme();
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
    const sparkScore = match.sparkScore || 70;
    const { text: activeStatus, isOnline } = getLastActiveStatus(match.partner.lastActive);
    const interests = match.partner.profile?.interests?.slice(0, 2) || [];

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(match);
    };

    const handleLongPress = () => {
        if (!showOptions) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        
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

    const handlePressIn = () => {
        scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const cardStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
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
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            delayLongPress={400}
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
                    <View
                        style={[
                            styles.icebreaker,
                            { backgroundColor: isDark ? 'rgba(236, 72, 153, 0.15)' : 'rgba(236, 72, 153, 0.1)' }
                        ]}
                    >
                        <Text style={styles.icebreakerText}>Tap to say hi! 👋</Text>
                    </View>
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
                            <Ionicons name="sparkles" size={11} color="#fff" />
                            <Text style={styles.sparkText}>{sparkScore}%</Text>
                        </LinearGradient>
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
                size={18}
                color={isDark ? '#64748b' : '#9ca3af'}
                style={styles.chevron}
            />
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 16,
        borderWidth: 1,
        minHeight: 96,
    },
    avatarSection: {
        position: 'relative',
        marginRight: 10,
    },
    avatarWrapper: {
        position: 'relative',
    },
    avatar: {
        width: 52,
        height: 52,
        borderRadius: 26,
    },
    avatarPlaceholder: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 14,
        height: 14,
        borderRadius: 7,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#10b981',
    },
    onlineDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981',
    },
    unreadBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#ec4899',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    unreadText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    contentSection: {
        flex: 1,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 6,
    },
    name: {
        fontSize: 15,
        fontWeight: '600',
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
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 9,
        gap: 3,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '600',
    },
    preview: {
        fontSize: 13,
        lineHeight: 17,
        marginBottom: 6,
    },
    icebreaker: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
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
    sparkContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    sparkBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 9,
        gap: 3,
    },
    sparkText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
    interestsContainer: {
        flexDirection: 'row',
        gap: 5,
        flex: 1,
        flexWrap: 'wrap',
    },
    interestBadge: {
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 7,
    },
    interestText: {
        fontSize: 10,
        fontWeight: '500',
    },
    chevron: {
        marginLeft: 6,
    },
});
