import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export function OnboardingScreenBackdrop() {
  const { colors } = useTheme();
  return <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />;
}
