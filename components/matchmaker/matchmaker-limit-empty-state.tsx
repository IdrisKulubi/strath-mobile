import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import {
  ChevronRight,
  Lightbulb,
  Moon,
  Sparkles,
  UserRoundPen,
} from 'lucide-react-native';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';

interface MatchmakerLimitEmptyStateProps {
  voiceText?: string | null;
  replies?: string[];
  busy?: boolean;
  onReply?: (reply: string) => void;
}

interface RefineAction {
  reply: string;
  title: string;
  subtitle: string;
  Icon: typeof Sparkles;
}

const ACTION_META: Record<string, Omit<RefineAction, 'reply'>> = {
  'Help me refine my type': {
    title: 'Refine my type',
    subtitle: 'Vibe, energy, or seriousness',
    Icon: Sparkles,
  },
  'What should I improve?': {
    title: 'What should I improve?',
    subtitle: 'Profile tips that help matching',
    Icon: UserRoundPen,
  },
  'Give me a date idea': {
    title: 'Give me a date idea',
    subtitle: 'Something light while you wait',
    Icon: Lightbulb,
  },
  'Save this for tomorrow': {
    title: 'Save this for tomorrow',
    subtitle: 'Keep today’s direction locked in',
    Icon: Moon,
  },
};

function resolveActions(replies: string[]): RefineAction[] {
  const mapped = replies
    .map((reply) => {
      const meta = ACTION_META[reply];
      if (!meta) {
        return {
          reply,
          title: reply,
          subtitle: 'Tell the matchmaker more',
          Icon: Sparkles,
        };
      }
      return { reply, ...meta };
    })
    .slice(0, 4);

  if (mapped.length > 0) return mapped;

  return Object.entries(ACTION_META).map(([reply, meta]) => ({ reply, ...meta }));
}

export function MatchmakerLimitEmptyState({
  voiceText,
  replies = [],
  busy = false,
  onReply,
}: MatchmakerLimitEmptyStateProps) {
  const actions = resolveActions(replies);
  const trimmedVoice = voiceText?.trim() || null;

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      accessibilityRole="summary"
      accessibilityLabel="You're out of searches for today. Fine-tune your matchmaker for tomorrow."
      style={styles.wrap}
    >
      <View style={styles.hero}>
        <View style={styles.orbGlow}>
          <MatchmakerOrb state="paused" size={56} />
        </View>
        <Text style={styles.eyebrow}>Paused for today</Text>
        <Text style={styles.title}>Out of searches</Text>
        <Text style={styles.body}>
          Your preferences are saved. Use this quiet moment to make tomorrow sharper —
          or just wait it out.
        </Text>
      </View>

      {trimmedVoice ? (
        <Animated.View entering={FadeInDown.delay(60).duration(220)} style={styles.voiceRow}>
          <View style={styles.voiceBubble}>
            <Text style={styles.voiceText}>{trimmedVoice}</Text>
          </View>
        </Animated.View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionLabel}>While you wait</Text>
        <View style={styles.actions}>
          {actions.map((action, index) => {
            const { Icon } = action;
            return (
              <Animated.View
                key={action.reply}
                entering={FadeInDown.delay(90 + index * 40).duration(220)}
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={action.title}
                  accessibilityHint={action.subtitle}
                  disabled={busy}
                  onPress={() => onReply?.(action.reply)}
                  style={({ pressed }) => [
                    styles.action,
                    pressed && !busy && styles.pressed,
                    busy && styles.disabled,
                  ]}
                >
                  <View style={styles.actionIcon}>
                    {busy ? (
                      <ActivityIndicator size="small" color={MATCHMAKER_HOME.primary} />
                    ) : (
                      <Icon size={18} color={MATCHMAKER_HOME.primary} />
                    )}
                  </View>
                  <View style={styles.actionCopy}>
                    <Text style={styles.actionTitle}>{action.title}</Text>
                    <Text style={styles.actionSubtitle}>{action.subtitle}</Text>
                  </View>
                  {!busy ? (
                    <ChevronRight size={18} color={MATCHMAKER_HOME.subtleForeground} />
                  ) : null}
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      </View>

      <Text style={styles.footer}>Searches refresh tomorrow. Typing below also fine-tunes.</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.section,
    paddingTop: SPACING.tight,
  },
  hero: {
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    gap: SPACING.tight,
  },
  orbGlow: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(226, 173, 87, 0.10)',
    borderWidth: 1,
    borderColor: 'rgba(226, 173, 87, 0.22)',
    marginBottom: SPACING.micro,
  },
  eyebrow: {
    color: MATCHMAKER_HOME.warning,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  title: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 320,
  },
  voiceRow: {
    paddingHorizontal: SPACING.micro,
  },
  voiceBubble: {
    backgroundColor: MATCHMAKER_HOME.surface,
    borderColor: MATCHMAKER_HOME.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.compact,
  },
  voiceText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  section: {
    gap: SPACING.compact,
  },
  sectionLabel: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    paddingHorizontal: SPACING.micro,
  },
  actions: {
    gap: SPACING.tight,
  },
  action: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    borderColor: MATCHMAKER_HOME.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.compact,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217, 74, 143, 0.12)',
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  actionTitle: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  actionSubtitle: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  footer: {
    color: MATCHMAKER_HOME.subtleForeground,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: SPACING.base,
  },
  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
