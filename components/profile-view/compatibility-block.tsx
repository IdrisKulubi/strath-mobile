import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { CompatibilityBar } from '@/components/home/compatibility-bar';

interface CompatibilityBlockProps {
    score: number;
    reasons: string[];
}

export function CompatibilityBlock({ score, reasons }: CompatibilityBlockProps) {
    const { colors, isDark } = useTheme();

    return (
        <View style={[styles.container, {
            backgroundColor: isDark ? 'rgba(233,30,140,0.08)' : 'rgba(233,30,140,0.05)',
            borderColor: colors.primary + '30',
        }]}>
            <View style={styles.scoreRow}>
                <View style={styles.scoreLabelWrap}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                    <Text style={[styles.scoreLabel, { color: colors.mutedForeground }]}>
                        Compatibility
                    </Text>
                </View>
                <Text style={[styles.scoreNumber, { color: colors.primary }]}>
                    {score}% match
                </Text>
            </View>

            <CompatibilityBar score={score} animationDelay={300} />

            {reasons.length > 0 && (
                <View style={styles.reasonsWrap}>
                    <Text style={[styles.reasonsLabel, { color: colors.mutedForeground }]}>
                        Why you might click
                    </Text>
                    <View style={styles.reasonChips}>
                        {reasons.map((reason, i) => (
                            <View
                                key={i}
                                style={[styles.chip, {
                                    backgroundColor: isDark ? 'rgba(233,30,140,0.15)' : 'rgba(233,30,140,0.1)',
                                    borderColor: colors.primary + '40',
                                }]}
                            >
                                <Text style={[styles.chipText, { color: colors.primary }]}>
                                    {reason}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    scoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    scoreLabelWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    scoreLabel: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    scoreNumber: {
        fontSize: 16,
        fontWeight: '700',
    },
    reasonsWrap: {
        gap: 8,
    },
    reasonsLabel: {
        fontSize: 12,
        fontWeight: '500',
    },
    reasonChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chip: {
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 5,
    },
    chipText: {
        fontSize: 13,
        fontWeight: '600',
    },
});
