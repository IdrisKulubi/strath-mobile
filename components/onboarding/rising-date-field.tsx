import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

function formatIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(iso: string) {
  const parsed = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function parseIsoDate(iso: string, fallback: Date) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    return new Date(`${iso}T12:00:00`);
  }
  return fallback;
}

export function RisingDateField({
  value,
  onChange,
  maximumDate,
  minimumDate,
  error,
  placeholder = 'Choose your birth date',
  accessibilityLabel = 'Choose date of birth',
  initiallyOpen = false,
}: {
  value: string;
  onChange: (isoDate: string) => void;
  maximumDate: Date;
  minimumDate: Date;
  error?: string;
  placeholder?: string;
  accessibilityLabel?: string;
  /** Show wheel sliders on first paint (e.g. birthday beat). */
  initiallyOpen?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const useLiquidGlass = isLiquidGlassAvailable();

  const defaultWheelDate = useMemo(() => {
    const fallback = new Date(maximumDate);
    fallback.setFullYear(fallback.getFullYear() - 5);
    return fallback;
  }, [maximumDate]);

  const committedDate = useMemo(
    () => parseIsoDate(value, defaultWheelDate),
    [defaultWheelDate, value],
  );

  const [showPicker, setShowPicker] = useState(initiallyOpen);
  const [draftDate, setDraftDate] = useState(committedDate);

  function handleWheelChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === 'android' && event.type === 'dismissed') {
      setShowPicker(false);
      return;
    }
    if (date) setDraftDate(date);
  }

  function openPicker() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDraftDate(committedDate);
    setShowPicker(true);
  }

  function confirmDate() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(formatIsoDate(draftDate));
    setShowPicker(false);
  }

  const borderColor = error ? colors.destructive : showPicker ? colors.primary : colors.primary;
  const previewIso = showPicker ? formatIsoDate(draftDate) : value;
  const previewLabel = previewIso ? formatDisplayDate(previewIso) : placeholder;

  return (
    <View style={styles.field}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Opens the date wheels"
        accessibilityState={{ expanded: showPicker }}
        onPress={() => {
          if (showPicker) setShowPicker(false);
          else openPicker();
        }}
        style={({ pressed }) => [
          styles.triggerHost,
          styles.triggerShadow,
          { borderColor, opacity: pressed ? 0.92 : 1 },
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
            <Ionicons name="calendar" size={22} color={colors.primaryForeground} />
          </View>
          <View style={styles.labelBlock}>
            <Text style={[styles.kicker, { color: colors.mutedForeground }]}>Birth date</Text>
            <Text
              style={[styles.valueText, { color: value ? colors.foreground : colors.primaryText }]}
              numberOfLines={1}
            >
              {value ? formatDisplayDate(value) : placeholder}
            </Text>
          </View>
          <Ionicons
            name={showPicker ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.mutedForeground}
          />
        </View>
      </Pressable>

      {showPicker ? (
        <View style={[styles.pickerCard, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}>
          <Text style={[styles.panelOverline, { color: colors.mutedForeground }]}>Scroll the wheels</Text>
          <View style={[styles.previewPill, { backgroundColor: colors.controlActive, borderColor: colors.primary }]}>
            <Text style={[styles.previewText, { color: colors.foreground }]}>{previewLabel}</Text>
          </View>

          <View style={styles.wheelFrame}>
            <View style={[styles.selectionRail, { borderColor: colors.primary, backgroundColor: colors.controlActive }]} />
            <View style={styles.wheelPicker}>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                themeVariant={isDark ? 'dark' : 'light'}
                maximumDate={maximumDate}
                minimumDate={minimumDate}
                onChange={handleWheelChange}
                style={styles.nativeSpinner}
              />
            </View>
          </View>

          <View style={styles.pickerFooter}>
            <Pressable
              accessibilityRole="button"
              onPress={confirmDate}
              style={({ pressed }) => [
                styles.confirmButton,
                {
                  borderColor: colors.primary,
                  backgroundColor: colors.primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Text style={[styles.confirmText, { color: colors.primaryForeground }]}>Use this birth date</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const WHEEL_HEIGHT = 220;

const styles = StyleSheet.create({
  field: { gap: SPACING.compact },
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
  pickerCard: {
    width: '100%',
    borderRadius: RADIUS.row,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: SPACING.compact,
    paddingHorizontal: SPACING.base,
    gap: SPACING.compact,
  },
  panelOverline: {
    ...TYPOGRAPHY.caption,
    fontWeight: '600',
    textAlign: 'center',
  },
  previewPill: {
    alignSelf: 'center',
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    paddingHorizontal: SPACING.section,
    paddingVertical: SPACING.tight,
    maxWidth: '100%',
  },
  previewText: { ...TYPOGRAPHY.body, fontWeight: '700', textAlign: 'center' },
  wheelFrame: {
    width: '100%',
    height: WHEEL_HEIGHT,
    borderRadius: RADIUS.row,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  selectionRail: {
    position: 'absolute',
    left: SPACING.tight,
    right: SPACING.tight,
    top: '50%',
    marginTop: -22,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    opacity: 0.95,
  },
  wheelPicker: {
    width: '100%',
    height: WHEEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nativeSpinner: {
    width: '100%',
    height: WHEEL_HEIGHT,
  },
  pickerFooter: {
    width: '100%',
    paddingBottom: SPACING.compact,
  },
  confirmButton: {
    width: '100%',
    minHeight: HEIGHTS.primaryControl,
    borderRadius: RADIUS.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.section,
  },
  confirmText: {
    ...TYPOGRAPHY.body,
    fontWeight: '700',
    textAlign: 'center',
  },
  error: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
