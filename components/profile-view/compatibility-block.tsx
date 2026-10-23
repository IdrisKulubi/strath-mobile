import React, { useMemo } from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';

import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { formatMatchReasonsLine } from '@/lib/match-reason-format';
import { getMatchTier } from '@/lib/match-tier';
import { useTheme } from '@/hooks/use-theme';

interface CompatibilityBlockProps {
    score: number;
    reasons: string[];
}

/**
 * Qualitative compatibility on profile detail. Score drives tier copy only;
 * reasons are shown as plain language, not template chips.
 */
export function CompatibilityBlock({ score, reasons }: CompatibilityBlockProps) {
    const { colors, isDark } = useTheme();
    const tier = getMatchTier(score);

    const reasonsSentence = useMemo(
        () => formatMatchReasonsLine(reasons, 4),
        [reasons],
    );

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? colors.card : colors.muted,
                    borderColor: colors.border,
                },
            ]}
        >
            <View style={styles.header}>
                <RNText style={[styles.title, { color: colors.foreground }]}>{tier.label}</RNText>
                <RNText style={[styles.helper, { color: colors.mutedForeground }]}>{tier.helper}</RNText>
            </View>

            {reasonsSentence ? (
                <RNText style={[styles.reasonsLine, { color: colors.mutedForeground }]}>
                    {reasonsSentence}
                </RNText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.base,
        gap: SPACING.compact,
    },
    header: {
        gap: SPACING.micro,
    },
    title: {
        ...TYPOGRAPHY.headline,
    },
    helper: {
        ...TYPOGRAPHY.caption,
    },
    reasonsLine: {
        ...TYPOGRAPHY.caption,
        lineHeight: 18,
    },
});
