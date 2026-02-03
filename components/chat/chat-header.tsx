import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
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
}

export function ChatHeader({ partnerName, partnerImage, isOnline = false, onMorePress }: ChatHeaderProps) {
    const { colors } = useTheme();
    const router = useRouter();

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.back();
    };

    const initial = partnerName.charAt(0).toUpperCase();

    return (
        <View style={[styles.container, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            {/* Back Button */}
            <Pressable
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
                        <Text className="text-white text-lg font-bold">{initial}</Text>
                    </View>
                )}
                {isOnline && (
                    <View style={[styles.onlineIndicator, { backgroundColor: '#34C759' }]} />
                )}
            </View>

            {/* Name */}
            <View style={styles.infoContainer}>
                <Text className="text-foreground text-[17px] font-semibold" numberOfLines={1}>
                    {partnerName}
                </Text>
                {isOnline && (
                    <Text className="text-muted-foreground text-[13px]">Online</Text>
                )}
            </View>

            {/* More Button */}
            <Pressable
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
