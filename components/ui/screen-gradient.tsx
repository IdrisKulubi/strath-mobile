/**
 * Prefer flat Screen background. Gradient only when explicitly requested.
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
  /** Default false — flat token background per DESIGN.md */
  gradient?: boolean;
}

export function ScreenGradient({
  children,
  edges = ['top'],
  style,
  gradient = false,
}: ScreenGradientProps) {
  const { colors, isDark } = useTheme();

  if (!isDark || !gradient) {
    return (
      <SafeAreaView
        edges={edges}
        style={[styles.flex, { backgroundColor: colors.background }, style]}
      >
        {children}
      </SafeAreaView>
    );
  }

  const start =
    'backgroundGradientStart' in colors
      ? (colors as { backgroundGradientStart: string }).backgroundGradientStart
      : colors.card;
  const end = colors.background;

  return (
    <LinearGradient
      colors={[start, end]}
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
