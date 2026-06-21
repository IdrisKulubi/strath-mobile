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
    compact?: boolean;
    showSubtitle?: boolean;
}

export function HomeHeader({
    firstName,
    compact = false,
    showSubtitle = false,
}: HomeHeaderProps) {
    const { colors } = useTheme();
    const greeting = getGreeting();

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <View style={styles.greetingRow}>
                <Text
                    style={[
                        compact ? styles.greetingCompact : styles.greeting,
                        { color: colors.foreground },
                    ]}
                >
                    {greeting}
                    {firstName ? ', ' : ''}
                </Text>
                {firstName ? (
                    <Text
                        style={[
                            compact ? styles.greetingCompact : styles.greeting,
                            { color: colors.primary },
                        ]}
                    >
                        {firstName}
                    </Text>
                ) : null}
            </View>
            {showSubtitle ? (
                <Text variant="muted" style={[styles.subtitle, { color: colors.mutedForeground }]}>
                    Your introduction is being prepared
                </Text>
            ) : null}
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
    greetingRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'baseline',
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
