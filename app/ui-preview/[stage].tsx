import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { ArrowLeft } from 'phosphor-react-native';

type StageView = {
  title: string;
  subtitle: string;
  blocks: string[];
  cta: string;
};

const STAGE_MAP: Record<string, StageView> = {
  'weekly-drop': {
    title: 'Weekly Drop',
    subtitle: 'Compact urgency card + full drop details',
    blocks: ['Expires in 36h 14m', 'Top 3 face cards', '+2 more matches', 'Talk to StrathSpace'],
    cta: 'Open Drop Details',
  },
  missions: {
    title: 'Match Missions',
    subtitle: 'Action card for post-match IRL nudges',
    blocks: ['☕ Coffee mission', '2 days left', 'Accept Mission', 'Suggest Other'],
    cta: 'Accept Mission',
  },
  'vibe-check': {
    title: 'Vibe Check Call',
    subtitle: '3-minute voice-only flow',
    blocks: ['⏰ 2:47 countdown', 'Audio only', 'Suggested topic', 'Meet / Pass decision'],
    cta: 'Start Vibe Check',
  },
  pulse: {
    title: 'Campus Pulse',
    subtitle: 'Anonymous feed with reactions + reveal flow',
    blocks: ['Anonymous card', '🔥 💀 🫶 reactions', 'Reveal to me', 'Post composer'],
    cta: 'Create Post',
  },
  'study-date': {
    title: 'Study Date Mode',
    subtitle: 'Quick live status + nearby students',
    blocks: ['Location picker', 'Until time picker', 'Vibe selector', 'Go Live toggle'],
    cta: 'Go Live',
  },
  compatibility: {
    title: 'Compatibility Breakdown',
    subtitle: 'Deep match insights in detail view',
    blocks: ['Overall: 87%', 'Lifestyle bar', 'Personality bar', 'Strength + friction'],
    cta: 'View Full Breakdown',
  },
  'hype-me': {
    title: 'Hype Me',
    subtitle: 'Social proof vouches on profile',
    blocks: ['Share invite link', 'Vouch cards', 'Approve / Hide toggles', 'External write flow'],
    cta: 'Copy Invite Link',
  },
  'blind-dates': {
    title: 'Blind Date Challenge',
    subtitle: 'Code-word based IRL proposal flow',
    blocks: ['Campus location', 'Suggested time', 'Code word', "I'm In / Not Now"],
    cta: "I'm In 🎉",
  },
};

export default function UiPreviewStageScreen() {
  const { stage } = useLocalSearchParams<{ stage: string }>();
  const router = useRouter();
  const { colors, isDark } = useTheme();

  const data = STAGE_MAP[stage || 'weekly-drop'] || STAGE_MAP['weekly-drop'];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={22} color={colors.foreground} weight="bold" />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.foreground }]} numberOfLines={1}>
          {data.title} Mock
        </Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.hero, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff', borderColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.foreground }]}>{data.title}</Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{data.subtitle}</Text>

          <View style={styles.stack}>
            {data.blocks.map((item) => (
              <View key={item} style={[styles.row, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)' }]}>
                <Text style={[styles.rowText, { color: colors.foreground }]}>{item}</Text>
              </View>
            ))}
          </View>

          <Pressable style={[styles.cta, { backgroundColor: colors.primary }]}>
            <Text style={[styles.ctaText, { color: colors.primaryForeground }]}>{data.cta}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    maxWidth: '70%',
  },
  scroll: { flex: 1 },
  content: { padding: 16 },
  hero: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  title: { fontSize: 22, fontWeight: '800' },
  subtitle: { fontSize: 13, fontWeight: '600' },
  stack: { gap: 8, marginTop: 6 },
  row: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  rowText: { fontSize: 13, fontWeight: '700' },
  cta: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { fontSize: 13, fontWeight: '800' },
});
