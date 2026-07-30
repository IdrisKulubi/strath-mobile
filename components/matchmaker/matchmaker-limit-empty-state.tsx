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
  Icon: typeof Sparkles;
}

const ACTION_META: Record<string, Omit<RefineAction, 'reply'>> = {
  'Help me refine my type': {
    title: 'Refine my type',
    Icon: Sparkles,
  },
  'What should I improve?': {
    title: 'Profile tips',
    Icon: UserRoundPen,
  },
  'Give me a date idea': {
    title: 'Date idea',
    Icon: Lightbulb,
  },
  'Save this for tomorrow': {
    title: 'Save for tomorrow',
    Icon: Moon,
  },
};

const DEFAULT_ACTIONS: RefineAction[] = Object.entries(ACTION_META).map(([reply, meta]) => ({
  reply,
  ...meta,
}));

function resolveActions(replies: string[]): RefineAction[] {
  const mapped = replies
    .map((reply) => {
      const meta = ACTION_META[reply];
      if (!meta) {
        return {
          reply,
          title: reply,
          Icon: Sparkles,
        };
      }
      return { reply, ...meta };
    })
    .slice(0, 3);

  return mapped.length > 0 ? mapped : DEFAULT_ACTIONS.slice(0, 3);
}

function shouldShowVoice(voiceText: string | null | undefined, actions: RefineAction[]) {
  const trimmed = voiceText?.trim();
  if (!trimmed) return false;

  const normalizedVoice = trimmed.toLowerCase();
  const duplicatesTitle = actions.some((action) => normalizedVoice.includes(action.title.toLowerCase()));
  return !duplicatesTitle && trimmed.length > 24;
}

export function MatchmakerLimitEmptyState({
  voiceText,
  replies = [],
  busy = false,
  onReply,
}: MatchmakerLimitEmptyStateProps) {
  const actions = resolveActions(replies);
  const showVoice = shouldShowVoice(voiceText, actions);

  return (
    <Animated.View
      entering={FadeIn.duration(220)}
      accessibilityRole="summary"
      accessibilityLabel="Searches resume tomorrow. Fine-tune now if you want."
      style={styles.wrap}
    >
      <View style={styles.hero}>
        <MatchmakerOrb state="paused" size={44} />
        <Text style={styles.title}>Searches resume tomorrow</Text>
        <Text style={styles.body}>Fine-tune now if you want. I saved what I learned today.</Text>
      </View>

      {showVoice ? (
        <Animated.View entering={FadeInDown.delay(50).duration(200)} style={styles.voiceRow}>
          <Text style={styles.voiceText}>{voiceText?.trim()}</Text>
        </Animated.View>
      ) : null}

      <View style={styles.actions}>
        {actions.map((action, index) => {
          const { Icon } = action;
          return (
            <Animated.View
              key={action.reply}
              entering={FadeInDown.delay(70 + index * 35).duration(200)}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={action.title}
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
                    <Icon size={16} color={MATCHMAKER_HOME.primary} />
                  )}
                </View>
                <Text style={styles.actionTitle}>{action.title}</Text>
                {!busy ? (
                  <ChevronRight size={16} color={MATCHMAKER_HOME.subtleForeground} />
                ) : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      <Text style={styles.footer}>Typing below also fine-tunes for tomorrow.</Text>
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
  title: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  body: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    maxWidth: 300,
  },
  voiceRow: {
    paddingHorizontal: SPACING.micro,
  },
  voiceText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
  },
  actions: {
    gap: SPACING.tight,
  },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.compact,
    borderColor: MATCHMAKER_HOME.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.base,
    paddingVertical: SPACING.compact,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(217, 74, 143, 0.10)',
  },
  actionTitle: {
    flex: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
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
    backgroundColor: MATCHMAKER_HOME.surfacePressed,
  },
  disabled: {
    opacity: 0.55,
  },
});
