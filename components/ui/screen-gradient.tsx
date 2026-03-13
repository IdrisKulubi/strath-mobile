/**
 * ScreenGradient
 *
 * In dark mode renders the brand gradient (#2d1b47 → #1a0d2e) as the screen
 * background. In light mode falls back to a plain SafeAreaView with the light
 * background color so the gradient never appears in light mode.
 *
 * Drop-in replacement for:
 *   <SafeAreaView style={{ backgroundColor: colors.background }}>
 *     ...
 *   </SafeAreaView>
 *
 * Usage:
 *   <ScreenGradient edges={['top']}>
 *     ...
 *   </ScreenGradient>
 */

import React from 'react';
import { StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';

interface ScreenGradientProps {
    children: React.ReactNode;
    edges?: Edge[];
    style?: StyleProp<ViewStyle>;
}

export function ScreenGradient({
    children,
    edges = ['top'],
    style,
}: ScreenGradientProps) {
    const { colors, isDark } = useTheme();

    if (!isDark) {
        return (
            <SafeAreaView
                edges={edges}
                style={[styles.flex, { backgroundColor: colors.background }, style]}
            >
                {children}
            </SafeAreaView>
        );
    }

    return (
        <LinearGradient
            colors={['#2d1b47', '#1a0d2e']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={[styles.flex, style]}
        >
            <SafeAreaView edges={edges} style={styles.flex}>
                {children}
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
});
