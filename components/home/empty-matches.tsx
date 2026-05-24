import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface EmptyMatchesProps {
    allActioned?: boolean;
    hasUpcomingQueued?: boolean;
}

export function EmptyMatches({ allActioned }: EmptyMatchesProps) {
    const { colors } = useTheme();

    const title = allActioned
        ? "You're through today's five"
        : "Today's shortlist is ready";
    const body = allActioned
        ? "Your choices shape tomorrow's shortlist. A fresh set arrives in the morning."
        : 'Five profiles, chosen for you. Review them when you have a few minutes — no endless browsing.';

    return (
        <View style={styles.section}>
            <Text variant="h3" style={{ color: colors.foreground }}>
                {title}
            </Text>
            <Text variant="muted" style={[styles.body, { color: colors.mutedForeground }]}>
                {body}
            </Text>
            <Text variant="label" style={{ color: colors.mutedForeground, marginTop: SPACING.compact }}>
                Refreshes daily
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.section,
        paddingBottom: SPACING.base,
        gap: SPACING.tight,
    },
    body: {
        maxWidth: 340,
    },
});
