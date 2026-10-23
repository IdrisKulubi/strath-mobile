import React from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme } from '@/lib/onboarding-theme';

interface OnboardingAccentTitleProps {
    before: string;
    accent: string;
    after?: string;
}

export function OnboardingAccentTitle({ before, accent, after = '' }: OnboardingAccentTitleProps) {
    const theme = useOnboardingTheme();

    return (
        <Text style={[styles.title, { color: theme.foreground }]}>
            {before}
            <Text style={{ color: theme.primary }}>{accent}</Text>
            {after}
        </Text>
    );
}

const styles = StyleSheet.create({
    title: {
        ...TYPOGRAPHY.display,
        fontSize: 24,
        lineHeight: 30,
        textAlign: 'left',
    },
});
