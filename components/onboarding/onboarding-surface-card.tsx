import React from 'react';
import { View, StyleSheet, type ViewProps } from 'react-native';

import { useOnboardingTheme } from '@/lib/onboarding-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';

interface OnboardingSurfaceCardProps extends ViewProps {
    children: React.ReactNode;
}

export function OnboardingSurfaceCard({ children, style, ...props }: OnboardingSurfaceCardProps) {
    const theme = useOnboardingTheme();

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.surface,
                    borderColor: theme.border,
                },
                style,
            ]}
            {...props}
        >
            {children}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        width: '100%',
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.base,
    },
});
