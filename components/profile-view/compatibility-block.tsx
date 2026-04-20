import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { getMatchTier } from '@/lib/match-tier';

interface CompatibilityBlockProps {
    score: number;
    reasons: string[];
}

/**
 * Qualitative compatibility block shown on profile detail views. We no longer
 * surface a raw percentage to the user — the score still drives matching
 * server-side, but here we show a tier label + concrete shared-signal chips
 * (the "why you might click" reasons) which are what actually helps users.
 */
export function CompatibilityBlock({ score, reasons }: CompatibilityBlockProps) {
    const { colors, isDark } = useTheme();
    const tier = getMatchTier(score);

    return (
        <View style={[styles.container, {
            backgroundColor: isDark ? 'rgba(233,30,140,0.08)' : 'rgba(233,30,140,0.05)',
            borderColor: colors.primary + '30',
        }]}>
            <View style={styles.header}>
                <View style={styles.headerIconWrap}>
                    <Ionicons name="sparkles" size={14} color={colors.primary} />
                </View>
                <View style={styles.headerTextWrap}>
                    <Text style={[styles.tierLabel, { color: colors.primary }]}>
                        {tier.label}
                    </Text>
                    <Text style={[styles.tierHelper, { color: colors.mutedForeground }]}>
                        {tier.helper}
                    </Text>
                </View>
            </View>

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
        gap: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    headerIconWrap: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(233,30,140,0.18)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTextWrap: {
        flex: 1,
        gap: 2,
    },
    tierLabel: {
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    tierHelper: {
        fontSize: 12,
        fontWeight: '500',
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
