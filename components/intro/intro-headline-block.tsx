import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/ui/text';
import type { IntroScheme } from '@/constants/intro-theme';
import { Colors } from '@/constants/theme';

type Props = {
  scheme: IntroScheme;
  headline: string;
  subheadline: string;
  align?: 'center' | 'left';
};

export function IntroHeadlineBlock({ scheme, headline, subheadline, align = 'center' }: Props) {
  const c = Colors[scheme];
  const ta = align === 'center' ? 'center' : 'left';
  return (
    <View style={[styles.wrap, align === 'center' && styles.center]}>
      <Text style={[styles.headline, { color: c.foreground, textAlign: ta }]}>{headline}</Text>
      <Text style={[styles.sub, { color: c.mutedForeground, textAlign: ta }]}>{subheadline}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 12,
    paddingHorizontal: 8,
  },
  center: {
    alignItems: 'center',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  sub: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400',
    maxWidth: 340,
  },
});
