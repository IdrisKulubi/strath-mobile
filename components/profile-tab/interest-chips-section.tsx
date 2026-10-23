import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import { QualityBadge } from '@/components/ui/quality-badge';

interface InterestChipsSectionProps {
    interests?: string[];
    qualities?: string[];
    zodiacSign?: string;
    personalityType?: string;
    loveLanguage?: string;
    lifestyleTags?: string[];
    isDark?: boolean;
}

export function InterestChipsSection({
    interests,
    qualities,
    zodiacSign,
    personalityType,
    loveLanguage,
    lifestyleTags,
    isDark = false,
}: InterestChipsSectionProps) {
    const { colors } = useTheme();
    const safeInterests = interests ?? [];
    const safeQualities = qualities ?? [];
    const safeLifestyleTags = lifestyleTags ?? [];

    const personalityChips = [zodiacSign, personalityType, loveLanguage].filter(Boolean) as string[];
    const allChips = [...personalityChips, ...safeInterests, ...safeLifestyleTags];
    const hasContent = allChips.length > 0 || safeQualities.length > 0;

    if (!hasContent) return null;

    return (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.section}>
            <Text variant="label" style={[styles.label, { color: colors.mutedForeground }]}>
                Interests
            </Text>
            <View style={styles.chipsWrap}>
                {allChips.map((chip, index) => (
                    <View
                        key={`interest-chip-${index}-${chip}`}
                        style={[
                            styles.pill,
                            {
                                borderColor: colors.border,
                                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.muted,
                            },
                        ]}
                    >
                        <Text style={[styles.pillText, { color: colors.foreground }]}>{chip}</Text>
                    </View>
                ))}
            </View>
            {safeQualities.length > 0 && (
                <View style={styles.qualitiesWrap}>
                    {safeQualities.map((q, i) => (
                        <QualityBadge key={`${q}-${i}`} quality={q} isDark={isDark} />
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.section,
    },
    label: {
        marginBottom: SPACING.compact,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.tight,
    },
    pill: {
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
        borderRadius: RADIUS.full,
        borderWidth: 1,
    },
    pillText: {
        ...TYPOGRAPHY.callout,
        fontWeight: '500',
    },
    qualitiesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.tight,
        marginTop: SPACING.compact,
    },
});
