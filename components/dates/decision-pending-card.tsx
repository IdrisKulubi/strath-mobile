import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import type { MutualDate, CallStage } from '@/hooks/use-date-requests';

interface DecisionPendingCardProps {
    match: MutualDate;
    index: number;
    onPress: (match: MutualDate) => void;
}

function buildCopy(match: MutualDate): { title: string; subtitle: string; cta: string } {
    const name = match.withUser.firstName;
    const stage: CallStage = match.callStage ?? 'decision_pending_both';
    switch (stage) {
        case 'decision_pending_me':
            return {
                title: 'Finish your decision',
                subtitle: `${name} said meet — your turn.`,
                cta: 'Decide now',
            };
        case 'decision_pending_partner':
            return {
                title: 'Waiting on them',
                subtitle: `You said meet. ${name} hasn't responded yet — tap to nudge or change your mind.`,
                cta: 'Open decision',
            };
        case 'decision_pending_both':
        default:
            return {
                title: 'Finish your decision',
                subtitle: `Both of you still need to choose meet or pass after your call with ${name}.`,
                cta: 'Decide now',
            };
    }
}

export function DecisionPendingCard({ match, index, onPress }: DecisionPendingCardProps) {
    const { colors, isDark } = useTheme();
    const copy = buildCopy(match);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress(match);
    };

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 60).springify().damping(14)}
            style={styles.wrapper}
        >
            <Pressable
                accessibilityRole="button"
                onPress={handlePress}
                style={({ pressed }) => [
                    styles.card,
                    {
                        backgroundColor: isDark ? 'rgba(245,158,11,0.10)' : 'rgba(245,158,11,0.08)',
                        borderColor: isDark ? 'rgba(245,158,11,0.35)' : 'rgba(245,158,11,0.25)',
                        opacity: pressed ? 0.92 : 1,
                    },
                ]}
            >
                <View style={styles.row}>
                    <View style={[styles.avatarRing, { borderColor: '#f59e0b' }]}>
                        {match.withUser.profilePhoto ? (
                            <CachedImage
                                uri={match.withUser.profilePhoto}
                                style={styles.avatar}
                                fallbackType="avatar"
                            />
                        ) : (
                            <View
                                style={[
                                    styles.avatar,
                                    styles.avatarFallback,
                                    { backgroundColor: colors.muted },
                                ]}
                            >
                                <Ionicons name="person" size={22} color={colors.mutedForeground} />
                            </View>
                        )}
                    </View>

                    <View style={styles.body}>
                        <View style={styles.statusRow}>
                            <Ionicons name="alert-circle" size={14} color="#f59e0b" />
                            <Text style={[styles.statusLabel, { color: '#f59e0b' }]}>
                                Decision pending
                            </Text>
                        </View>
                        <Text style={[styles.title, { color: colors.foreground }]}>
                            {copy.title}
                        </Text>
                        <Text
                            style={[styles.subtitle, { color: colors.mutedForeground }]}
                            numberOfLines={2}
                        >
                            {copy.subtitle}
                        </Text>
                    </View>
                </View>

                <View style={[styles.ctaRow, { borderTopColor: colors.border }]}>
                    <Text style={[styles.ctaText, { color: colors.primary }]}>{copy.cta}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.primary} />
                </View>
            </Pressable>
        </Animated.View>
    );
}

const AVATAR = 48;

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    card: {
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    row: {
        flexDirection: 'row',
        gap: 14,
        padding: 16,
    },
    avatarRing: {
        width: AVATAR + 4,
        height: AVATAR + 4,
        borderRadius: (AVATAR + 4) / 2,
        borderWidth: 2,
        padding: 1,
        overflow: 'hidden',
    },
    avatar: {
        width: AVATAR,
        height: AVATAR,
        borderRadius: AVATAR / 2,
    },
    avatarFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    body: {
        flex: 1,
        gap: 4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    statusLabel: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    ctaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    ctaText: {
        fontSize: 14,
        fontWeight: '700',
    },
});
