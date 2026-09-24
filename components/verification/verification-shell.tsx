import React from 'react';
import { ActivityIndicator, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

interface VerificationShellProps {
    children: React.ReactNode;
    footer?: React.ReactNode;
    loading?: boolean;
}

export function VerificationShell({ children, footer, loading }: VerificationShellProps) {
    const { isDark, colors } = useTheme();
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
        <Screen edges={['top']} style={[styles.flex, { backgroundColor: colors.background }]}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
            <View style={styles.header}>
                <Text style={[styles.brand, { color: colors.foreground }]}>StrathSpace</Text>
                <Text style={[styles.chapter, { color: colors.mutedForeground }]}>Build trust</Text>
            </View>
            <View style={[styles.sheet, { backgroundColor: colors.sheet }]}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {children}
            </ScrollView>
            {footer ? (
                <View style={[styles.footer, { backgroundColor: colors.sheet, paddingBottom: Math.max(insets.bottom, SPACING.base) }]}>
                    {footer}
                </View>
            ) : null}
            </View>
        </Screen>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    header: { minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: SPACING.tight },
    brand: { ...TYPOGRAPHY.title, fontWeight: '700' },
    chapter: { ...TYPOGRAPHY.caption },
    sheet: { flex: 1, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    scrollContent: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.base,
        paddingBottom: SPACING.base,
        gap: SPACING.compact,
        flexGrow: 1,
    },
    footer: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'transparent',
    },
});
