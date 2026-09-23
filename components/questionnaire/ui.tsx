import React from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';
import { compatibilityLabel, type Person } from '@/lib/questionnaire';

export function Page({ title, eyebrow, children, back = false }: { title: string; eyebrow?: string; children: React.ReactNode; back?: boolean }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.page}
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
        >
          {back ? <Action label="Back" tone="ghost" onPress={() => router.canGoBack() ? router.back() : router.replace('/dating' as never)} /> : null}
          <View style={styles.headingGroup}>
            {eyebrow ? <Text style={[styles.eyebrow, { color: colors.primary }]}>{eyebrow}</Text> : null}
            <Text accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          </View>
          {children}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Copy({ children, muted = false }: { children: React.ReactNode; muted?: boolean }) {
  const { colors } = useTheme();
  return <Text style={[styles.copy, { color: muted ? colors.mutedForeground : colors.foreground }]}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  const { colors } = useTheme();
  return <Text accessibilityRole="header" style={[styles.sectionLabel, { color: colors.foreground }]}>{children}</Text>;
}

export function Action({
  label,
  onPress,
  disabled = false,
  selected = false,
  tone = 'secondary',
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  tone?: 'primary' | 'secondary' | 'ghost' | 'danger';
  accessibilityHint?: string;
}) {
  const { colors } = useTheme();
  const primary = tone === 'primary';
  const danger = tone === 'danger';
  const ghost = tone === 'ghost';
  const backgroundColor = primary
    ? colors.primary
    : selected
      ? colors.secondary
      : ghost
        ? 'transparent'
        : colors.card;
  const textColor = primary ? colors.primaryForeground : danger ? colors.destructive : colors.foreground;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled, selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        {
          borderColor: danger ? colors.destructive : selected ? colors.primary : ghost ? 'transparent' : colors.border,
          backgroundColor,
          opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        },
      ]}
    >
      <Text style={[styles.actionText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = 'default',
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric';
  placeholder?: string;
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.foreground }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        multiline={multiline}
        keyboardType={keyboardType}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          multiline && styles.multiline,
          { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.card },
        ]}
      />
    </View>
  );
}

export function Progress({ value, total, label }: { value: number; total: number; label: string }) {
  const { colors } = useTheme();
  const percentage = total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: total, now: value }} accessibilityLabel={label} style={styles.progressGroup}>
      <View style={[styles.progressTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.progressFill, { backgroundColor: colors.primary, width: `${percentage}%` }]} />
      </View>
      <Text style={[styles.progressLabel, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export function Notice({ children, tone = 'info' }: { children: React.ReactNode; tone?: 'info' | 'success' | 'error' }) {
  const { colors } = useTheme();
  const color = tone === 'success' ? colors.success : tone === 'error' ? colors.destructive : colors.mutedForeground;
  return (
    <View style={[styles.notice, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text accessibilityRole={tone === 'error' ? 'alert' : undefined} style={[styles.noticeText, { color }]}>{children}</Text>
    </View>
  );
}

export function Feedback({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : 'We could not save that. Check your connection and try again.';
  return <Notice tone="error">{message}</Notice>;
}

export function Loading({ label = 'Loading your questionnaire' }: { label?: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.loading} accessibilityLiveRegion="polite">
      <ActivityIndicator accessibilityLabel={label} color={colors.primary} />
      <Copy muted>{label}</Copy>
    </View>
  );
}

export function PersonCard({ person }: { person: Person }) {
  const { colors } = useTheme();
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View ${person.name}'s profile`}
      onPress={() => router.push(`/compatibility/${person.id}` as never)}
      style={[styles.person, { borderBottomColor: colors.border }]}
    >
      {person.photos[0] ? <Image accessibilityLabel={`${person.name}'s profile photo`} source={{ uri: person.photos[0] }} style={styles.personPhoto} /> : null}
      <Text style={[styles.personName, { color: colors.foreground }]}>{person.name}, {person.age}</Text>
      <Copy muted>{person.city} · {person.intentions.join(', ')}</Copy>
      {person.compatibility ? <Copy>{compatibilityLabel(person.compatibility)}</Copy> : null}
      <Copy>{person.bio}</Copy>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safeArea: { flex: 1 },
  page: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingHorizontal: SPACING.screenX, paddingTop: SPACING.base, paddingBottom: 56, gap: SPACING.base },
  headingGroup: { gap: SPACING.micro, marginBottom: SPACING.tight },
  eyebrow: { ...TYPOGRAPHY.label, letterSpacing: 0.7, textTransform: 'uppercase' },
  title: { ...TYPOGRAPHY.display, maxWidth: 560 },
  copy: { ...TYPOGRAPHY.body, maxWidth: 640 },
  sectionLabel: { ...TYPOGRAPHY.title, marginTop: SPACING.tight },
  action: { minHeight: 48, paddingHorizontal: SPACING.base, paddingVertical: SPACING.compact, borderRadius: RADIUS.md, borderWidth: 1, justifyContent: 'center' },
  actionText: { ...TYPOGRAPHY.body, fontWeight: '600' },
  field: { gap: SPACING.tight },
  fieldLabel: { ...TYPOGRAPHY.body, fontWeight: '600' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: RADIUS.md, paddingHorizontal: SPACING.base, paddingVertical: SPACING.compact, ...TYPOGRAPHY.body },
  multiline: { minHeight: 112 },
  progressGroup: { gap: SPACING.tight },
  progressTrack: { height: 6, borderRadius: RADIUS.full, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: RADIUS.full },
  progressLabel: { ...TYPOGRAPHY.caption, fontVariant: ['tabular-nums'] },
  notice: { borderWidth: 1, borderRadius: RADIUS.md, padding: SPACING.base },
  noticeText: { ...TYPOGRAPHY.callout },
  loading: { minHeight: 96, alignItems: 'center', justifyContent: 'center', gap: SPACING.compact },
  person: { gap: SPACING.tight, paddingBottom: SPACING.section, borderBottomWidth: StyleSheet.hairlineWidth },
  personPhoto: { width: '100%', height: 300, borderRadius: RADIUS.lg },
  personName: { ...TYPOGRAPHY.title },
});
