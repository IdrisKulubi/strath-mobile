import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { Match, getRelativeTime } from '@/hooks/use-matches';
import * as Haptics from 'expo-haptics';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

interface MatchItemProps {
    match: Match;
    onPress: (match: Match) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MatchItem({ match, onPress }: MatchItemProps) {
    const { colors } = useTheme();
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        scale.value = withSpring(0.98, { damping: 15, stiffness: 400 });
    };

    const handlePressOut = () => {
        scale.value = withSpring(1, { damping: 15, stiffness: 400 });
    };

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(match);
    };

    // Get display info
    const partnerName = match.partner.name ||
        (match.partner.profile?.firstName
            ? `${match.partner.profile.firstName} ${match.partner.profile.lastName || ''}`.trim()
            : 'Unknown');

    const avatarUri = match.partner.image ||
        match.partner.profile?.profilePhoto ||
        (match.partner.profile?.photos?.[0]);

    const initial = partnerName.charAt(0).toUpperCase();

    const lastMessageText = match.lastMessage?.content || 'Say hi! 👋';
    const lastMessageTime = match.lastMessage?.createdAt
        ? getRelativeTime(match.lastMessage.createdAt)
        : getRelativeTime(match.createdAt);

    const unreadCount = match.unreadCount || 0;
    const hasUnread = unreadCount > 0;

    return (
        <AnimatedPressable
            style={[
                styles.container,
                { backgroundColor: colors.card },
                animatedStyle,
            ]}
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
        >
            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {avatarUri ? (
                    <CachedImage
                        uri={avatarUri}
                        style={styles.avatar}
                        fallbackType="avatar"
                    />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text className="text-white text-xl font-bold">{initial}</Text>
                    </View>
                )}
                {/* Online indicator (placeholder for future) */}
            </View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.topRow}>
                    <Text
                        className="text-foreground font-semibold text-[17px]"
                        numberOfLines={1}
                        style={styles.name}
                    >
                        {partnerName}
                    </Text>
                    <Text className="text-muted-foreground text-[13px]">
                        {lastMessageTime}
                    </Text>
                </View>

                <View style={styles.bottomRow}>
                    <Text
                        className={`text-[15px] ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
                        numberOfLines={1}
                        style={styles.preview}
                    >
                        {lastMessageText}
                    </Text>

                    {hasUnread && (
                        <View style={[styles.badge, { backgroundColor: colors.primary }]}>
                            <Text className="text-white text-xs font-bold">
                                {unreadCount > 99 ? '99+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
            </View>
        </AnimatedPressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 76,
    },
    avatarContainer: {
        marginRight: 12,
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
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    name: {
        flex: 1,
        marginRight: 8,
    },
    bottomRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    preview: {
        flex: 1,
        marginRight: 8,
    },
    badge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
});
