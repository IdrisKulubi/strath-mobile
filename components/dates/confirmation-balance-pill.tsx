import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import type { ConfirmationBalance } from '@/hooks/use-payment-status';
import { getBalancePillText } from '@/lib/confirmation-copy';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

interface ConfirmationBalancePillProps {
    balance: ConfirmationBalance;
    style?: object;
}

export function ConfirmationBalancePill({ balance, style }: ConfirmationBalancePillProps) {
    const { colors } = useTheme();

    if (balance.total <= 0) {
        return null;
    }

    const { primary, secondary } = getBalancePillText(balance);
    if (!primary) {
        return null;
    }

    return (
        <View
            style={[
                styles.pill,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                },
                style,
            ]}
            accessibilityRole="text"
            accessibilityLabel={secondary ? `${primary}. ${secondary}` : primary}
        >
            <Ionicons name="ticket-outline" size={18} color={colors.primary} />
            <View style={styles.textWrap}>
                <RNText style={[styles.primary, { color: colors.foreground }]}>{primary}</RNText>
                {secondary ? (
                    <RNText style={[styles.secondary, { color: colors.mutedForeground }]}>
                        {secondary}
                    </RNText>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
        paddingVertical: SPACING.compact,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        alignSelf: 'stretch',
    },
    textWrap: {
        flex: 1,
        gap: 2,
    },
    primary: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
    secondary: {
        ...TYPOGRAPHY.caption,
    },
});
