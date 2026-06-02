import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useVerificationThemedStyles } from '@/lib/verification/use-verification-themed-styles';
import { SPACING } from '@/lib/design-tokens';

interface VerificationStepCardProps {
    title: string;
    meta?: string;
    helperText?: string;
    children: React.ReactNode;
    action?: React.ReactNode;
    headerAction?: {
        label: string;
        onPress: () => void;
        accessibilityLabel?: string;
    };
}

export function VerificationStepCard({
    title,
    meta,
    helperText,
    children,
    action,
    headerAction,
}: VerificationStepCardProps) {
    const theme = useVerificationThemedStyles();

    return (
        <View style={theme.card}>
            <View style={styles.header}>
                <View style={styles.titleBlock}>
                    <Text variant="large" style={{ color: theme.colors.foreground }}>
                        {title}
                    </Text>
                    {meta ? (
                        <Text variant="caption" style={{ color: theme.colors.mutedForeground }}>
                            {meta}
                        </Text>
                    ) : null}
                </View>
                {headerAction ? (
                    <Pressable
                        onPress={headerAction.onPress}
                        accessibilityRole="button"
                        accessibilityLabel={
                            headerAction.accessibilityLabel ?? headerAction.label
                        }
                        hitSlop={8}
                        style={styles.headerAction}
                    >
                        <Text
                            variant="caption"
                            style={{ color: theme.colors.primary, fontWeight: '600' }}
                        >
                            {headerAction.label}
                        </Text>
                    </Pressable>
                ) : null}
            </View>
            {children}
            {helperText ? (
                <Text variant="caption" style={{ color: theme.colors.destructive }}>
                    {helperText}
                </Text>
            ) : null}
            {action}
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: SPACING.compact,
    },
    titleBlock: {
        flex: 1,
        gap: 2,
    },
    headerAction: {
        minWidth: 44,
        minHeight: 44,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.tight,
    },
});
