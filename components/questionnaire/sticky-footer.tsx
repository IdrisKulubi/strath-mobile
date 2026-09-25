import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function StickyFooter({
  primaryLabel,
  onPrimaryPress,
  primaryDisabled,
  primaryLoading,
  secondaryLabel,
  onSecondaryPress,
  reserveTabBar = false,
}: {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  /** Extra space when footer sits above the dating tab bar */
  reserveTabBar?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const disabled = primaryDisabled || primaryLoading;
  const tabBarLift = reserveTabBar ? HEIGHTS.tabBar + SPACING.tight : 0;

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, SPACING.base) + tabBarLift,
          backgroundColor: colors.background,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={onPrimaryPress}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: colors.primary, opacity: disabled ? 0.45 : pressed ? 0.88 : 1 },
        ]}
      >
        {primaryLoading ? (
          <ActivityIndicator color={colors.primaryForeground} accessibilityLabel={primaryLabel} />
        ) : (
          <Text style={[styles.primaryText, { color: colors.primaryForeground }]}>{primaryLabel}</Text>
        )}
      </Pressable>
      {secondaryLabel && onSecondaryPress ? (
        <Pressable
          accessibilityRole="button"
          onPress={onSecondaryPress}
          style={({ pressed }) => [styles.secondary, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={[styles.secondaryText, { color: colors.mutedForeground }]}>{secondaryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: SPACING.screenX,
    paddingTop: SPACING.compact,
    gap: SPACING.tight,
  },
  primary: {
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.base,
  },
  primaryText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  secondary: { minHeight: HEIGHTS.touchMin, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { ...TYPOGRAPHY.callout, fontWeight: '600' },
});
