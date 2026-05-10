import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { PreferenceMode, getPreferenceLabel, useMatchPreferences } from '@/hooks/use-match-discovery';

const MODES: PreferenceMode[] = [
  'similar_to_me',
  'different_from_me',
  'surprise_me',
  'active_only',
];

const AVAILABILITY: {
  key: 'availableNow' | 'availableToday' | 'openToCalls';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: 'availableToday', label: 'Available today', icon: 'today-outline' },
  { key: 'openToCalls', label: 'Open to calls', icon: 'call-outline' },
];

export function MatchPreferencePanel() {
  const { colors, isDark } = useTheme();
  const {
    data: preferences,
    updatePreferences,
    isUpdatingPreferences,
  } = useMatchPreferences();

  const selectedMode = preferences?.preferenceMode ?? 'surprise_me';

  return (
    <View style={[styles.card, { backgroundColor: isDark ? colors.card : '#fff', borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
          <Ionicons name="options-outline" size={18} color={colors.primaryForeground} />
        </View>
        <View style={styles.headerCopy}>
          <Text style={[styles.title, { color: colors.foreground }]}>
            Tune tomorrow&apos;s matches
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Small signals help the next five feel sharper
          </Text>
        </View>
      </View>

      <View style={styles.modeRow}>
        {MODES.map((mode) => {
          const selected = selectedMode === mode;
          return (
            <Pressable
              key={mode}
              disabled={isUpdatingPreferences}
              onPress={() => updatePreferences({ preferenceMode: mode })}
              style={[
                styles.modePill,
                {
                  backgroundColor: selected ? colors.primary : isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.04)',
                  borderColor: selected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.modeText, { color: selected ? colors.primaryForeground : colors.foreground }]}>
                {getPreferenceLabel(mode)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.availabilityRow, { borderTopColor: colors.border }]}>
        {AVAILABILITY.map((item) => {
          const selected = Boolean(preferences?.[item.key]);
          return (
            <Pressable
              key={item.key}
              disabled={isUpdatingPreferences}
              onPress={() => updatePreferences({ [item.key]: !selected })}
              style={[
                styles.availabilityPill,
                {
                  backgroundColor: selected ? 'rgba(16,185,129,0.12)' : 'transparent',
                  borderColor: selected ? 'rgba(16,185,129,0.35)' : colors.border,
                },
              ]}
            >
              <Ionicons
                name={item.icon}
                size={14}
                color={selected ? '#10b981' : colors.mutedForeground}
              />
              <Text style={[styles.availabilityText, { color: selected ? '#10b981' : colors.mutedForeground }]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginBottom: 18,
    borderRadius: 20,
    borderWidth: 1,
    padding: 14,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCopy: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  modeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  modePill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  availabilityRow: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  availabilityPill: {
    flex: 1,
    minHeight: 38,
    borderRadius: 13,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  availabilityText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
