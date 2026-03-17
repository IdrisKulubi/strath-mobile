import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

function getSecondsUntilMidnight(): number {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return Math.floor((midnight.getTime() - now.getTime()) / 1000);
}

function formatCountdown(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

interface EmptyMatchesProps {
    /** When true, shows the "refreshes tomorrow" countdown. When false, shows "no matches yet" state. */
    allActioned?: boolean;
}

export function EmptyMatches({ allActioned = false }: EmptyMatchesProps) {
    const { colors, isDark } = useTheme();
    const [secondsLeft, setSecondsLeft] = useState(getSecondsUntilMidnight);

    useEffect(() => {
        if (!allActioned) return;
        const interval = setInterval(() => {
            setSecondsLeft(getSecondsUntilMidnight());
        }, 1000);
        return () => clearInterval(interval);
    }, [allActioned]);

    return (
        <View style={styles.container}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(233,30,140,0.12)' : 'rgba(233,30,140,0.08)' }]}>
                <Ionicons name="heart-outline" size={40} color={colors.primary} />
            </View>

            {allActioned ? (
                <>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        We're preparing your next matches
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        Check back tomorrow for a fresh set
                    </Text>
                    <View style={[styles.countdownWrap, { backgroundColor: isDark ? colors.card : '#f5f5f5', borderColor: colors.border }]}>
                        <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>
                            Refreshes in
                        </Text>
                        <Text style={[styles.countdown, { color: colors.primary }]}>
                            {formatCountdown(secondsLeft)}
                        </Text>
                    </View>
                </>
            ) : (
                <>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        We're preparing your next matches
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        Check back tomorrow for a fresh set
                    </Text>
                </>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 48,
        paddingBottom: 32,
        gap: 12,
    },
    iconWrap: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
    },
    countdownWrap: {
        borderRadius: 16,
        borderWidth: 1,
        paddingHorizontal: 24,
        paddingVertical: 14,
        alignItems: 'center',
        gap: 4,
        marginTop: 8,
    },
    countdownLabel: {
        fontSize: 12,
        fontWeight: '500',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    countdown: {
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: 2,
        fontVariant: ['tabular-nums'],
    },
});
