import React from 'react';
import { View, type ViewStyle, StyleSheet } from 'react-native';

import { SPACING } from '@/lib/design-tokens';

type Gap = keyof typeof SPACING;

interface StackProps {
  children: React.ReactNode;
  gap?: Gap;
  horizontal?: boolean;
  style?: ViewStyle;
}

export function Stack({ children, gap = 'base', horizontal = false, style }: StackProps) {
  return (
    <View
      style={[
        horizontal ? styles.row : styles.column,
        { gap: SPACING[gap] },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { flexDirection: 'column' },
  row: { flexDirection: 'row', alignItems: 'center' },
});
