import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';

const ROWS = [
  { icon: 'sparkles-outline' as const, label: 'Curated daily matches' },
  { icon: 'shield-checkmark-outline' as const, label: 'Campus verified' },
  { icon: 'chatbubbles-outline' as const, label: 'Real conversations' },
];

type Props = {
  isDark: boolean;
};

export function LoginBenefitsCard({ isDark }: Props) {
  const c = isDark ? Colors.dark : Colors.light;
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(34, 18, 51, 0.76)' : 'rgba(255, 255, 255, 0.88)',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(233, 30, 140, 0.14)',
        },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.cardTitle, { color: c.foreground }]}>Why StrathSpace</Text>
        <View
          style={[
            styles.headerChip,
            {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(233, 30, 140, 0.08)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(233, 30, 140, 0.12)',
            },
          ]}
        >
          <Ionicons name="sparkles" size={12} color={c.primary} />
        </View>
      </View>
      {ROWS.map((row) => (
        <View key={row.label} style={styles.row}>
          <View
            style={[
              styles.iconWrap,
              {
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(233, 30, 140, 0.08)',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(233, 30, 140, 0.1)',
              },
            ]}
          >
            <Ionicons name={row.icon} size={17} color={c.primary} />
          </View>
          <Text style={[styles.rowLabel, { color: c.foreground }]}>{row.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 15,
    gap: 10,
    shadowColor: '#1a0d2e',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
    opacity: 0.84,
  },
  headerChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 31,
    height: 31,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
    lineHeight: 19,
  },
});
