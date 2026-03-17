import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface MatchReasonsProps {
    reasons: string[];
}

const REASON_EMOJIS: { pattern: RegExp; emoji: string }[] = [
    { pattern: /nature|outdoor|hike|hiking|walk/i, emoji: '🌿' },
    { pattern: /cook|food|dinner|coffee/i, emoji: '🍳' },
    { pattern: /music|afrobeats|hip-hop|r&b|gospel/i, emoji: '🎵' },
    { pattern: /art|creative|design|museum|gallery/i, emoji: '🎨' },
    { pattern: /film|movie|tv/i, emoji: '🎬' },
    { pattern: /banter|conversation|talk|deep/i, emoji: '💬' },
    { pattern: /energy|vibe|social/i, emoji: '✨' },
];

function getReasonEmoji(reason: string) {
    return REASON_EMOJIS.find((entry) => entry.pattern.test(reason))?.emoji ?? '✨';
}

function cleanReason(reason: string) {
    return reason
        .replace(/^similar\s+/i, '')
        .replace(/^same\s+/i, '')
        .replace(/^both\s+/i, '')
        .trim();
}

function buildInsight(reasons: string[]) {
    const cleaned = reasons
        .map(cleanReason)
        .filter(Boolean)
        .slice(0, 2)
        .map((reason) => reason.toLowerCase());

    if (cleaned.length >= 2) {
        return `You both seem aligned on ${cleaned[0]} and ${cleaned[1]}, which could make the first conversation feel easy.`;
    }

    if (cleaned.length === 1) {
        return `You both seem drawn to ${cleaned[0]}, which gives this match a natural starting point.`;
    }

    return 'There is a strong overlap in how you both tend to connect, which is why this match surfaced today.';
}

export function MatchReasons({ reasons }: MatchReasonsProps) {
    const { colors, isDark } = useTheme();

    if (!reasons || reasons.length === 0) return null;

    const topReasons = reasons.slice(0, 3);
    const insight = buildInsight(topReasons);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.025)',
                },
            ]}
        >
            <View style={styles.labelRow}>
                <Text style={[styles.label, { color: colors.mutedForeground }]}>
                    ✨ Why you might click
                </Text>
            </View>

            <View style={styles.chipsWrap}>
                {topReasons.map((reason, i) => (
                    <View
                        key={`${reason}-${i}`}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.9)',
                            },
                        ]}
                    >
                        <Text style={styles.chipEmoji}>{getReasonEmoji(reason)}</Text>
                        <Text style={[styles.chipText, { color: colors.foreground }]}>
                            {cleanReason(reason)}
                        </Text>
                    </View>
                ))}
            </View>

            <View
                style={[
                    styles.insightWrap,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.82)',
                    },
                ]}
            >
                <Text style={[styles.insightLabel, { color: colors.mutedForeground }]}>
                    💡 AI Insight
                </Text>
                <Text style={[styles.insightText, { color: colors.foreground }]}>
                    {insight}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 20,
        padding: 14,
        gap: 12,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 9,
    },
    chipEmoji: {
        fontSize: 14,
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
    },
    insightWrap: {
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
        gap: 6,
    },
    insightLabel: {
        fontSize: 12,
        fontWeight: '700',
    },
    insightText: {
        fontSize: 13,
        lineHeight: 19,
    },
});
