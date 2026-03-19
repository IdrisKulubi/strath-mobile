import React, { useCallback, useEffect, useRef, useState } from 'react';
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

function getSecondsUntil(targetIso: string): number {
    const target = new Date(targetIso);
    const now = Date.now();
    const diff = Math.floor((target.getTime() - now) / 1000);
    return Math.max(0, diff);
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
    /** ISO timestamp when next pairs will be available (e.g. after cooldown). When set, countdown uses this instead of midnight. */
    nextPairsAvailableAt?: string;
    /** Called when countdown reaches 0 so the parent can refetch new pairs. */
    onCountdownEnd?: () => void;
}

export function EmptyMatches({ allActioned = false, nextPairsAvailableAt, onCountdownEnd }: EmptyMatchesProps) {
    const { colors, isDark } = useTheme();
    const getSeconds = useCallback(
        () => (nextPairsAvailableAt ? getSecondsUntil(nextPairsAvailableAt) : getSecondsUntilMidnight()),
        [nextPairsAvailableAt]
    );
    const [secondsLeft, setSecondsLeft] = useState(getSeconds);
    const hasFiredCountdownEnd = useRef(false);

    useEffect(() => {
        setSecondsLeft(getSeconds());
        hasFiredCountdownEnd.current = false;
    }, [getSeconds]);

    useEffect(() => {
        if (!allActioned) return;
        const interval = setInterval(() => {
            const next = getSeconds();
            setSecondsLeft(next);
            if (next <= 0 && onCountdownEnd && !hasFiredCountdownEnd.current) {
                hasFiredCountdownEnd.current = true;
                onCountdownEnd();
            }
        }, 1000);
        return () => clearInterval(interval);
    }, [allActioned, getSeconds, onCountdownEnd]);

    return (
        <View style={styles.container}>
            <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(233,30,140,0.12)' : 'rgba(233,30,140,0.08)' }]}>
                <Ionicons name="heart-outline" size={40} color={colors.primary} />
            </View>

            {allActioned ? (
                <>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        Cooking up your next matches🫣
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        Fresh set drops once done— we&apos;ve got you ✨
                    </Text>
                    <View style={[styles.countdownWrap, { backgroundColor: isDark ? colors.card : '#f5f5f5', borderColor: colors.border }]}>
                        <Text style={[styles.countdownLabel, { color: colors.mutedForeground }]}>
                            Resets in
                        </Text>
                        <Text style={[styles.countdown, { color: colors.primary }]}>
                            {formatCountdown(secondsLeft)}
                        </Text>
                    </View>
                </>
            ) : (
                <>
                    <Text style={[styles.title, { color: colors.foreground }]}>
                        Cooking up your next matches🫣
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                        Fresh set drops tomorrow — we&apos;ve got you ✨
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
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 8,
        minHeight: 72,
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
        lineHeight: 36,
        fontVariant: ['tabular-nums'],
    },
});
