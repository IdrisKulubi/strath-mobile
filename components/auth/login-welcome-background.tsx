import { StyleSheet, View } from 'react-native';
import type { ThemeColors } from '@/hooks/use-theme';

type Props = {
  isDark: boolean;
  colors: ThemeColors;
};

export function LoginWelcomeBackground({ colors }: Props) {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} pointerEvents="none" />
  );
}
