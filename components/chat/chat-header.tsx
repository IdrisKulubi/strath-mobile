import React from 'react';
import { View, Pressable, StyleSheet, Text } from 'react-native';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { useRouter } from 'expo-router';
import { CaretLeft, DotsThreeVertical } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface ChatHeaderProps {
    partnerName: string;
    partnerImage?: string | null;
    isOnline?: boolean;
    onMorePress?: () => void;
    onBackPress?: () => void;
}

export function ChatHeader({ partnerName, partnerImage, isOnline = false, onMorePress, onBackPress }: ChatHeaderProps) {
    const { colors } = useTheme();
    const router = useRouter();

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onBackPress) onBackPress();
        else router.back();
    };

    const initial = partnerName.charAt(0).toUpperCase();

    return (
        <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            {/* Back Button */}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Back to messages"
                style={styles.backButton}
                onPress={handleBack}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <CaretLeft size={28} color={colors.primary} />
            </Pressable>

            {/* Avatar */}
            <View style={styles.avatarContainer}>
                {partnerImage ? (
                    <CachedImage uri={partnerImage} style={styles.avatar} fallbackType="avatar" />
                ) : (
                    <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.avatarInitial, { color: colors.primaryForeground }]}>{initial}</Text>
                    </View>
                )}
                {isOnline && (
                    <View style={[styles.onlineIndicator, { backgroundColor: '#34C759' }]} />
                )}
            </View>

            {/* Name */}
            <View style={styles.infoContainer}>
                <Text style={[styles.partnerName, { color: colors.foreground }]} numberOfLines={1}>
                    {partnerName}
                </Text>
                {isOnline && (
                    <Text style={[styles.onlineLabel, { color: colors.mutedForeground }]}>Online</Text>
                )}
            </View>

            {/* More Button */}
            <Pressable
                accessibilityRole="button"
                accessibilityLabel="Conversation options"
                style={styles.moreButton}
                onPress={onMorePress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <DotsThreeVertical size={22} color={colors.mutedForeground} weight="bold" />
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 10,
        borderBottomWidth: StyleSheet.hairlineWidth,
        gap: 8,
    },
    backButton: {
        padding: 4,
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarInitial: { fontSize: 18, fontWeight: '700' },
    partnerName: { fontSize: 17, fontWeight: '600' },
    onlineLabel: { fontSize: 13 },
    onlineIndicator: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 12,
        height: 12,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    infoContainer: {
        flex: 1,
    },
    moreButton: {
        padding: 8,
    },
});
