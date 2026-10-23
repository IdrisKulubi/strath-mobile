import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export function MoreSheet({
  visible,
  onClose,
  visibleOnProfile,
  onVisibleChange,
  explanation,
  onExplanationChange,
  onDelete,
  onPrevious,
  showDelete,
  showPrevious,
  busy,
}: {
  visible: boolean;
  onClose: () => void;
  visibleOnProfile: boolean;
  onVisibleChange: (value: boolean) => void;
  explanation: string;
  onExplanationChange: (value: string) => void;
  onDelete?: () => void;
  onPrevious?: () => void;
  showDelete?: boolean;
  showPrevious?: boolean;
  busy?: boolean;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={[styles.scrim, { backgroundColor: colors.background + 'CC' }]} onPress={onClose} accessibilityLabel="Close sheet" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, SPACING.base) }]}>
          <View style={styles.sheetHeader}>
            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>More options</Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={12}>
              <Text style={[styles.done, { color: colors.primary }]}>Done</Text>
            </Pressable>
          </View>

          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={[styles.toggleTitle, { color: colors.foreground }]}>Show on my profile</Text>
              <Text style={[styles.toggleHint, { color: colors.mutedForeground }]}>
                Only people who also publish their answer can compare it.
              </Text>
            </View>
            <Switch
              accessibilityLabel="Show on my profile"
              value={visibleOnProfile}
              disabled={busy}
              onValueChange={onVisibleChange}
            />
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: colors.foreground }]}>Optional explanation</Text>
            <TextInput
              accessibilityLabel="Optional explanation"
              value={explanation}
              onChangeText={onExplanationChange}
              editable={!busy}
              multiline
              placeholder="Add context in your own words"
              placeholderTextColor={colors.mutedForeground}
              textAlignVertical="top"
              style={[
                styles.input,
                { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background },
              ]}
            />
          </View>

          {showPrevious && onPrevious ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={onPrevious} style={styles.linkRow}>
              <Text style={[styles.link, { color: colors.foreground }]}>Back to previous question</Text>
            </Pressable>
          ) : null}
          {showDelete && onDelete ? (
            <Pressable accessibilityRole="button" disabled={busy} onPress={onDelete} style={styles.linkRow}>
              <Text style={[styles.linkDanger, { color: colors.destructive }]}>Delete this answer</Text>
            </Pressable>
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1 },
  keyboard: { justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: RADIUS.lg,
    borderTopRightRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: SPACING.screenX,
    paddingTop: SPACING.base,
    gap: SPACING.section,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sheetTitle: { ...TYPOGRAPHY.title },
  done: { ...TYPOGRAPHY.callout, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.base, minHeight: 52 },
  toggleCopy: { flex: 1, gap: SPACING.micro },
  toggleTitle: { ...TYPOGRAPHY.body, fontWeight: '600' },
  toggleHint: { ...TYPOGRAPHY.caption },
  field: { gap: SPACING.tight },
  fieldLabel: { ...TYPOGRAPHY.body, fontWeight: '600' },
  input: {
    minHeight: 112,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.compact,
    ...TYPOGRAPHY.body,
  },
  linkRow: { minHeight: 44, justifyContent: 'center' },
  link: { ...TYPOGRAPHY.callout, fontWeight: '600' },
  linkDanger: { ...TYPOGRAPHY.callout, fontWeight: '600' },
});
