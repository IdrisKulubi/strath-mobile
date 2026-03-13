import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withRepeat,
    withTiming,
    withSequence,
    Easing,
    FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { ScheduledDate } from '@/hooks/use-date-requests';

interface PendingSetupCardProps {
    date: ScheduledDate;
    index: number;
}

export function PendingSetupCard({ date, index }: PendingSetupCardProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const pulse = useSharedValue(1);

    useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1.08, { duration: 900, easing: Easing.inOut(Easing.ease) }),
                withTiming(1, { duration: 900, easing: Easing.inOut(Easing.ease) }),
            ),
            -1,
            false,
        );
    }, [pulse]);

    const pulseStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulse.value }],
        opacity: 0.7 + (pulse.value - 1) * 3,
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 80).springify().damping(14)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            <View style={styles.row}>
                <View style={[styles.avatarWrap, { backgroundColor: colors.muted }]}>
                    {date.withUser.profilePhoto ? (
                        <CachedImage uri={date.withUser.profilePhoto} style={styles.avatar} />
                    ) : (
                        <Ionicons name="person-circle-outline" size={48} color={colors.mutedForeground} />
                    )}
                </View>

                <View style={styles.info}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                        {date.withUser.firstName}
                    </Text>
                    <View style={styles.statusRow}>
                        <Animated.View style={[styles.pulseDot, pulseStyle, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.statusText, { color: colors.mutedForeground }]}>
                            Being arranged by our team
                        </Text>
                    </View>
                    <Text style={[styles.subText, { color: colors.mutedForeground }]}>
                        We'll notify you once your date is confirmed.
                    </Text>
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        borderWidth: 1,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    avatarWrap: {
        width: 56,
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },
    info: {
        flex: 1,
        gap: 4,
    },
    name: {
        fontSize: 17,
        fontWeight: '700',
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pulseDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    statusText: {
        fontSize: 13,
        fontWeight: '600',
    },
    subText: {
        fontSize: 12,
        lineHeight: 16,
    },
});
