import React from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';

import { RisingInlineFeedback } from '@/components/onboarding/rising-inline-feedback';
import { RisingTextField } from '@/components/onboarding/rising-text-field';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function RisingLocationCityStep({
  city,
  hasLocation,
  locationLabel,
  loading,
  error,
  onRequestLocation,
  onCityChange,
  onManualCityEdit,
}: {
  city: string;
  hasLocation: boolean;
  locationLabel?: string;
  loading?: boolean;
  error?: string;
  onRequestLocation: () => void;
  onCityChange: (value: string) => void;
  onManualCityEdit: () => void;
}) {
  const { colors, isDark } = useTheme();
  const useLiquidGlass = isLiquidGlassAvailable();
  const borderColor = error ? colors.destructive : colors.primary;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.helper, { color: colors.mutedForeground }]}>
        Sharing your location helps us show people closer to you. You can type your city instead if you prefer.
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Use my location"
        accessibilityState={{ busy: loading }}
        disabled={loading}
        onPress={onRequestLocation}
        style={({ pressed }) => [
          styles.triggerHost,
          styles.triggerShadow,
          { borderColor, opacity: loading ? 0.7 : pressed ? 0.92 : 1 },
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
        <View style={styles.triggerContent}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary }]}>
            {loading ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Ionicons name="navigate" size={22} color={colors.primaryForeground} />
            )}
          </View>
          <View style={styles.labelBlock}>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>Current location</Text>
            <Text style={[styles.valueText, { color: colors.foreground }]} numberOfLines={1}>
              {loading ? 'Finding your city…' : 'Use my location'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
        </View>
      </Pressable>

      {hasLocation && locationLabel ? (
        <View style={[styles.successCard, { backgroundColor: colors.control, borderColor: colors.primary }]}>
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <View style={styles.successCopy}>
            <Text style={[styles.successTitle, { color: colors.foreground }]}>{locationLabel}</Text>
            <Text style={[styles.successHint, { color: colors.mutedForeground }]}>Location saved</Text>
          </View>
        </View>
      ) : null}

      {error ? <RisingInlineFeedback tone="error" message={error} /> : null}

      <Text style={[styles.dividerLabel, { color: colors.mutedForeground }]}>Or type your city instead</Text>
      <RisingTextField
        label="City"
        value={city}
        onChangeText={(value) => {
          onManualCityEdit();
          onCityChange(value);
        }}
        autoCapitalize="words"
        placeholder="e.g. Nairobi"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: SPACING.compact },
  helper: { ...TYPOGRAPHY.callout, textAlign: 'center' },
  triggerHost: {
    width: '100%',
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    overflow: 'hidden',
  },
  triggerShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 8,
  },
  glassSurface: {
    borderRadius: RADIUS.pill,
    borderCurve: 'continuous',
  },
  triggerContent: {
    minHeight: HEIGHTS.primaryControl,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.micro,
    paddingVertical: SPACING.micro,
    gap: SPACING.compact,
    zIndex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelBlock: { flex: 1, gap: 2, paddingVertical: SPACING.micro },
  kicker: { ...TYPOGRAPHY.caption, fontWeight: '600' },
  valueText: { ...TYPOGRAPHY.body, fontWeight: '700' },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
    borderRadius: RADIUS.row,
    borderWidth: 1,
    padding: SPACING.compact,
  },
  successCopy: { flex: 1, gap: SPACING.micro },
  successTitle: { ...TYPOGRAPHY.body, fontWeight: '700' },
  successHint: { ...TYPOGRAPHY.caption },
  dividerLabel: { ...TYPOGRAPHY.caption, fontWeight: '600', textAlign: 'center', marginTop: SPACING.tight },
});
