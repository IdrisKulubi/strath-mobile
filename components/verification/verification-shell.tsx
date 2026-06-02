import React from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { SPACING } from '@/lib/design-tokens';

interface VerificationShellProps {
    children: React.ReactNode;
    footer?: React.ReactNode;
    loading?: boolean;
}

export function VerificationShell({ children, footer, loading }: VerificationShellProps) {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();

    if (loading) {
        return (
            <Screen edges={['top', 'bottom']}>
                <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
                <View style={styles.loading}>
                    <ActivityIndicator size="large" />
                </View>
            </Screen>
        );
    }

    return (
        <Screen edges={['top']} style={styles.flex}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {children}
            </ScrollView>
            {footer ? (
                <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.base) }]}>
                    {footer}
                </View>
            ) : null}
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.section,
        paddingBottom: SPACING.large,
        gap: SPACING.comfortable,
    },
    footer: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'transparent',
    },
});
