import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  MATCHMAKER_CONVERSATION_STYLE_LABELS,
  MATCHMAKER_CONVERSATION_STYLES,
  type MatchmakerConversationStyle,
} from '@/lib/matchmaker/conversation-ui';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';

interface MatchmakerConversationStylePickerProps {
  value: MatchmakerConversationStyle;
  onChange: (style: MatchmakerConversationStyle) => void;
}

export function MatchmakerConversationStylePicker({
  value,
  onChange,
}: MatchmakerConversationStylePickerProps) {
  if (!__DEV__) return null;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>Conversation style preview</Text>
      <View style={styles.row}>
        {MATCHMAKER_CONVERSATION_STYLES.map((style) => {
          const selected = value === style;
          return (
            <Pressable
              key={style}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`Use ${MATCHMAKER_CONVERSATION_STYLE_LABELS[style]} style`}
              onPress={() => onChange(style)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.chipPressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {MATCHMAKER_CONVERSATION_STYLE_LABELS[style]}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.tight,
    paddingHorizontal: SPACING.screenX,
    paddingTop: SPACING.tight,
  },
  label: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    minHeight: 34,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: MATCHMAKER_HOME.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.compact,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
  },
  chipSelected: {
    borderColor: MATCHMAKER_HOME.primary,
    backgroundColor: MATCHMAKER_HOME.navActive,
  },
  chipPressed: {
    opacity: 0.8,
  },
  chipText: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: MATCHMAKER_HOME.foreground,
  },
});
