import React from 'react';
import { View, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
}

interface HomeHeaderProps {
    firstName?: string;
    matchCount?: number;
    focusedIndex?: number;
    compact?: boolean;
}

export function HomeHeader({ firstName, matchCount, focusedIndex, compact = false }: HomeHeaderProps) {
    const { colors } = useTheme();
    const greeting = getGreeting();
    const visibleCount = matchCount && matchCount > 0 ? Math.min(matchCount, 5) : 0;

    const subtitle =
        visibleCount > 0 && focusedIndex !== undefined
            ? `Profile ${focusedIndex + 1} of ${visibleCount}`
            : visibleCount > 0
              ? `${visibleCount} ${visibleCount === 1 ? 'profile' : 'profiles'} in today's shortlist`
              : 'Your introduction is being prepared';

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <Text
                style={[
                    compact ? styles.greetingCompact : styles.greeting,
                    { color: colors.foreground },
                ]}
            >
                {greeting}
                {firstName ? `, ${firstName}` : ''}
            </Text>
            <Text variant="muted" style={[styles.subtitle, { color: colors.mutedForeground }]}>
                {subtitle}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.comfortable,
        paddingBottom: SPACING.base,
        gap: SPACING.tight,
    },
    containerCompact: {
        paddingTop: SPACING.compact,
        paddingBottom: SPACING.tight,
        gap: SPACING.micro,
    },
    greeting: {
        ...TYPOGRAPHY.display,
    },
    greetingCompact: {
        ...TYPOGRAPHY.title,
        fontSize: 22,
        lineHeight: 28,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 18,
    },
});
