import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

interface RisingInlineFeedbackProps {
    message: string;
    tone?: 'hint' | 'error';
}

export function RisingInlineFeedback({ message, tone = 'hint' }: RisingInlineFeedbackProps) {
    const { colors } = useTheme();
    const error = tone === 'error';

    return (
        <View
            accessibilityRole={error ? 'alert' : 'text'}
            style={[styles.container, {
                backgroundColor: colors.control,
                borderColor: error ? colors.destructive : colors.controlBorder,
            }]}
        >
            <Text style={[styles.message, { color: error ? colors.destructive : colors.mutedForeground }]}>
                {message}
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: RADIUS.row,
        padding: SPACING.compact,
    },
    message: { ...TYPOGRAPHY.caption },
});
