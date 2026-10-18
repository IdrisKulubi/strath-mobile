import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getGlassTabBarHeight } from '@/components/navigation/glass-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

/** Scroll padding when the footer floats above content (includes tab bar lift when reserved). */
export function stickyFooterScrollPadding(
  bottomInset: number,
  reserveTabBar = false,
  pillCount = 1,
  tertiaryLink = false,
) {
  const tabBarLift = reserveTabBar ? getGlassTabBarHeight(bottomInset) + SPACING.tight : 0;
  const pills = pillCount * HEIGHTS.primaryControl + Math.max(0, pillCount - 1) * SPACING.tight;
  const linkRow = tertiaryLink ? HEIGHTS.touchMin + SPACING.tight : 0;
  return pills + linkRow + SPACING.compact * 2 + Math.max(bottomInset, SPACING.base) + tabBarLift + SPACING.section;
}

function GlassPillButton({
  label,
  onPress,
  disabled,
  loading,
  borderColor,
  textColor,
  prominent,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  borderColor: string;
  textColor: string;
  prominent?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const useLiquidGlass = isLiquidGlassAvailable();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.glassHost,
        prominent ? styles.glassShadow : styles.glassShadowSoft,
        styles.glassPinkBorder,
        {
          borderColor,
          opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
        },
      ]}
    >
      {useLiquidGlass ? (
        <GlassView
          glassEffectStyle="regular"
          tintColor={colors.risingGlassTint}
          colorScheme={isDark ? 'dark' : 'light'}
          style={[StyleSheet.absoluteFill, styles.glassSurface]}
        />
      ) : (
        <>
          <BlurView
            intensity={Platform.OS === 'ios' ? 48 : 36}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, styles.glassSurface]}
          />
          <View
            style={[
              StyleSheet.absoluteFill,
              styles.glassSurface,
              { backgroundColor: colors.risingGlassOverlay },
            ]}
          />
        </>
      )}
      <View style={styles.glassContent}>
        {loading ? (
          <ActivityIndicator color={textColor} accessibilityLabel={label} />
        ) : (
          <Text style={[styles.buttonText, prominent && styles.prominentLabel, { color: textColor }]}>{label}</Text>
        )}
      </View>
    </Pressable>
  );
}

export function StickyFooter({
  primaryLabel,
  onPrimaryPress,
  primaryDisabled,
  primaryLoading,
  secondaryLabel,
  onSecondaryPress,
  tertiaryLabel,
  onTertiaryPress,
  reserveTabBar = false,
  primaryGlass = false,
  glassStack = false,
  floating = false,
  tertiaryVariant = 'pill',
}: {
  primaryLabel: string;
  onPrimaryPress: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  /** Translucent liquid-glass pill instead of solid primary fill */
  primaryGlass?: boolean;
  /** Glass pills for tertiary, secondary, and primary (completion handoff) */
  glassStack?: boolean;
  secondaryLabel?: string;
  onSecondaryPress?: () => void;
  tertiaryLabel?: string;
  onTertiaryPress?: () => void;
  reserveTabBar?: boolean;
  floating?: boolean;
  tertiaryVariant?: 'pill' | 'link';
}) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const disabled = primaryDisabled || primaryLoading;
  const tabBarLift = reserveTabBar ? getGlassTabBarHeight(insets.bottom) + SPACING.tight : 0;
  const useLiquidGlass = isLiquidGlassAvailable();
  const useGlassPrimary = primaryGlass || glassStack;
  const useGlassSecondary = glassStack;
  const useGlassTertiary = glassStack;

  const body = (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: Math.max(insets.bottom, SPACING.base) + tabBarLift,
          backgroundColor: useGlassPrimary || floating ? 'transparent' : colors.background,
        },
      ]}
    >
      {tertiaryLabel && onTertiaryPress ? (
        useGlassTertiary ? (
          <GlassPillButton
            label={tertiaryLabel}
            onPress={onTertiaryPress}
            borderColor={colors.controlBorder}
            textColor={colors.primaryText}
          />
        ) : tertiaryVariant === 'link' ? (
          <Pressable
            accessibilityRole="button"
            onPress={onTertiaryPress}
            style={({ pressed }) => [styles.tertiaryLink, { opacity: pressed ? 0.72 : 1 }]}
          >
            <Text style={[styles.linkText, { color: colors.primaryText }]}>{tertiaryLabel}</Text>
          </Pressable>
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onTertiaryPress}
            style={({ pressed }) => [
              styles.outline,
              {
                borderColor: colors.controlBorder,
                backgroundColor: colors.control,
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.foreground }]}>{tertiaryLabel}</Text>
          </Pressable>
        )
      ) : null}
      {secondaryLabel && onSecondaryPress ? (
        useGlassSecondary ? (
          <GlassPillButton
            label={secondaryLabel}
            onPress={onSecondaryPress}
            borderColor={colors.primary}
            textColor={colors.primaryText}
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            onPress={onSecondaryPress}
            style={({ pressed }) => [
              styles.outline,
              {
                borderColor: colors.primary,
                backgroundColor: 'transparent',
                opacity: pressed ? 0.88 : 1,
              },
            ]}
          >
            <Text style={[styles.buttonText, { color: colors.primaryText }]}>{secondaryLabel}</Text>
          </Pressable>
        )
      ) : null}
      {useGlassPrimary ? (
        glassStack ? (
          <GlassPillButton
            label={primaryLabel}
            onPress={onPrimaryPress}
            disabled={disabled}
            loading={primaryLoading}
            borderColor={colors.primary}
            textColor={colors.foreground}
            prominent
          />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled }}
            disabled={disabled}
            onPress={onPrimaryPress}
            style={({ pressed }) => [
              styles.glassHost,
              styles.glassShadow,
              styles.glassPinkBorder,
              {
                borderColor: colors.primary,
                opacity: disabled ? 0.5 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {useLiquidGlass ? (
              <GlassView
                glassEffectStyle="regular"
                tintColor={colors.risingGlassTint}
                colorScheme={isDark ? 'dark' : 'light'}
                style={[StyleSheet.absoluteFill, styles.glassSurface]}
              />
            ) : (
              <>
                <BlurView
                  intensity={Platform.OS === 'ios' ? 48 : 36}
                  tint={isDark ? 'dark' : 'light'}
                  style={[StyleSheet.absoluteFill, styles.glassSurface]}
                />
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.glassSurface,
                    { backgroundColor: colors.risingGlassOverlay },
                  ]}
                />
              </>
            )}
            <View style={styles.glassContent}>
              {primaryLoading ? (
                <ActivityIndicator color={colors.foreground} accessibilityLabel={primaryLabel} />
              ) : (
                <Text style={[styles.buttonText, { color: colors.foreground }]}>{primaryLabel}</Text>
              )}
            </View>
          </Pressable>
        )
      ) : (
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
            <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>{primaryLabel}</Text>
          )}
        </Pressable>
      )}
    </View>
  );

  if (floating) {
    return <View style={styles.floatingHost} pointerEvents="box-none">{body}</View>;
  }

  return body;
}

const styles = StyleSheet.create({
  floatingHost: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  wrap: {
    paddingHorizontal: SPACING.screenX,
    paddingTop: SPACING.compact,
    gap: SPACING.tight,
    width: '100%',
  },
  primary: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.base,
  },
  outline: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.base,
  },
  tertiaryLink: {
    minHeight: HEIGHTS.touchMin,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.tight,
  },
  linkText: { ...TYPOGRAPHY.callout, fontWeight: '600', textAlign: 'center' },
  buttonText: { ...TYPOGRAPHY.body, fontWeight: '700', textAlign: 'center' },
  prominentLabel: { fontWeight: '800' },
  glassHost: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  glassPinkBorder: {
    borderWidth: 1,
  },
  glassShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  glassShadowSoft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 4,
  },
  glassSurface: {
    borderRadius: RADIUS.pill,
    borderCurve: 'continuous',
  },
  glassContent: {
    minHeight: HEIGHTS.primaryControl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.base,
    zIndex: 1,
  },
});
