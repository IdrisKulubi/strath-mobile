import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
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
        return `Aligned on ${cleaned[0]} and ${cleaned[1]}.`;
    }

    if (cleaned.length === 1) {
        return `You both seem drawn to ${cleaned[0]}.`;
    }

    return 'Strong overlap in how you both connect.';
}

/**
 * Compact reasons row: chips for the top shared signals plus a single-line
 * insight underneath. Intentionally minimal so the photo stays the hero of
 * the match card.
 */
export function MatchReasons({ reasons }: MatchReasonsProps) {
    const { colors, isDark } = useTheme();

    if (!reasons || reasons.length === 0) return null;

    const topReasons = reasons.slice(0, 3);
    const insight = buildInsight(topReasons);

    return (
        <View style={styles.container}>
            <View style={styles.chipsWrap}>
                {topReasons.map((reason, i) => (
                    <View
                        key={`${reason}-${i}`}
                        style={[
                            styles.chip,
                            {
                                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,23,42,0.05)',
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

            <Text style={[styles.insightText, { color: colors.mutedForeground }]} numberOfLines={2}>
                {insight}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 5,
    },
    chipEmoji: {
        fontSize: 12,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    insightText: {
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },
});
