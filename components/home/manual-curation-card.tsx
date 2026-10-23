import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { SPACING } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import { ManualCuration } from '@/hooks/use-daily-matches';

interface ManualCurationCardProps {
    curation?: ManualCuration | null;
}

export function ManualCurationCard(_props: ManualCurationCardProps) {
    const { colors } = useTheme();

    return (
        <View style={styles.section}>
            <Text variant="label" style={{ color: colors.mutedForeground }}>
                Preparing your shortlist
            </Text>
            <Text variant="h3" style={{ color: colors.foreground }}>
                Your next five are almost ready
            </Text>
            <Text variant="muted" style={[styles.body, { color: colors.mutedForeground }]}>
                We're ranking a small set from today's signals. You'll get a notification when
                they're live — usually within a few hours.
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
