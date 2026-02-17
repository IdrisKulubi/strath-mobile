import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

function Block({ title, subtitle, children, onPress }: { title: string; subtitle: string; children: React.ReactNode; onPress: () => void }) {
  const { colors, isDark } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.block,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
          borderColor: colors.border,
        },
      ]}
    >
      <View style={styles.blockHeader}>
        <Text style={[styles.blockTitle, { color: colors.foreground }]}>{title}</Text>
        <Text style={[styles.openText, { color: colors.primary }]}>Open</Text>
      </View>
      <Text style={[styles.blockSubtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
      {children}
    </Pressable>
  );
}

function Pill({ label }: { label: string }) {
  const { colors, isDark } = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
      <Text style={[styles.pillText, { color: colors.mutedForeground }]}>{label}</Text>
    </View>
  );
}

export default function UiPreviewScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  const openStage = (stage: string) => {
    router.push(`/ui-preview/${stage}` as any);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.foreground }]}>Upcoming UI Preview</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>Visual blueprint for Stages 4–12 before full logic is finished.</Text>

        <Block title="Stage 4 · Weekly Drop" subtitle="Compact strip in Find + full detail screen" onPress={() => openStage('weekly-drop')}>
          <View style={styles.row}><Pill label="Countdown" /><Pill label="Top 3 faces" /><Pill label="+N more" /></View>
        </Block>

        <Block title="Stage 5 · Match Missions" subtitle="Action cards inside Connections/Chat context" onPress={() => openStage('missions')}>
          <View style={styles.row}><Pill label="Mission type" /><Pill label="Deadline" /><Pill label="Accept/Suggest" /></View>
        </Block>

        <Block title="Stage 7 · Vibe Check" subtitle="3-step full-screen flow: prompt → call → decision" onPress={() => openStage('vibe-check')}>
          <View style={styles.row}><Pill label="3-min timer" /><Pill label="Audio only" /><Pill label="Meet/Pass" /></View>
        </Block>

        <Block title="Stage 8 · Pulse Feed" subtitle="Standalone anonymous campus feed tab/screen" onPress={() => openStage('pulse')}>
          <View style={styles.row}><Pill label="Post cards" /><Pill label="Reactions" /><Pill label="Reveal flow" /></View>
        </Block>

        <Block title="Stage 9 · Study Date" subtitle="Bottom-sheet quick toggle + nearby list" onPress={() => openStage('study-date')}>
          <View style={styles.row}><Pill label="Location" /><Pill label="Until time" /><Pill label="Go live" /></View>
        </Block>

        <Block title="Stage 10 · Compatibility" subtitle="Expandable section in match detail" onPress={() => openStage('compatibility')}>
          <View style={styles.row}><Pill label="Overall %" /><Pill label="Category bars" /><Pill label="Strength/Friction" /></View>
        </Block>

        <Block title="Stage 11 · Hype Me" subtitle="Profile section + friend vouch links" onPress={() => openStage('hype-me')}>
          <View style={styles.row}><Pill label="Share link" /><Pill label="Vouch cards" /><Pill label="Hide/Show" /></View>
        </Block>

        <Block title="Stage 12 · Blind Dates" subtitle="Mission-like proposal card with code word" onPress={() => openStage('blind-dates')}>
          <View style={styles.row}><Pill label="Location/time" /><Pill label="Code word" /><Pill label="I'm in / Not now" /></View>
        </Block>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, gap: 12, paddingBottom: 30 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 13, fontWeight: '500', marginBottom: 6 },
  block: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 8 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  blockTitle: { fontSize: 15, fontWeight: '800' },
  openText: { fontSize: 12, fontWeight: '700' },
  blockSubtitle: { fontSize: 12, fontWeight: '600' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { fontSize: 11, fontWeight: '700' },
});
