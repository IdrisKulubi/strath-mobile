import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, useReducedMotion } from 'react-native-reanimated';
import { ChevronRight } from 'lucide-react-native';

import { MatchmakerOrb } from '@/components/matchmaker/matchmaker-orb';
import { MatchmakerReplyIcon } from '@/components/matchmaker/matchmaker-reply-icon';
import { MatchmakerStreamingText } from '@/components/matchmaker/matchmaker-streaming-text';
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
}

const ACTION_TITLES: Record<string, string> = {
  'Help me refine my type': 'Refine my type',
  'What should I improve?': 'Profile tips',
  'Give me a date idea': 'Date idea',
  'Save this for tomorrow': 'Save for tomorrow',
};

const DEFAULT_REPLIES = [
  'Help me refine my type',
  'What should I improve?',
  'Give me a date idea',
];

function resolveActions(replies: string[]): RefineAction[] {
  const source = replies.length > 0 ? replies : DEFAULT_REPLIES;
  return source
    .map((reply) => ({
      reply,
      title: ACTION_TITLES[reply] ?? reply,
    }))
    .slice(0, 3);
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
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.duration(220)}
      accessibilityRole="summary"
      accessibilityLabel="Searches resume tomorrow. Fine-tune now if you want."
      style={styles.wrap}
    >
      <View style={styles.hero}>
        <MatchmakerOrb state="paused" size={44} />
        <Text style={styles.title}>Searches resume tomorrow</Text>
        <Text style={styles.body}>Pick one to continue, or come back tomorrow.</Text>
      </View>

      {showVoice ? (
        <Animated.View entering={reduceMotion ? undefined : FadeInDown.delay(50).duration(200)} style={styles.voiceRow}>
          <MatchmakerStreamingText
            text={voiceText?.trim() ?? ''}
            messageId="limit-empty-voice"
            animate
            style={styles.voiceText}
          />
        </Animated.View>
      ) : null}

      <View style={styles.actions}>
        {actions.map((action, index) => (
          <Animated.View
            key={action.reply}
            entering={reduceMotion ? undefined : FadeInDown.delay(70 + index * 35).duration(200)}
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
              <View style={styles.actionContent}>
                {busy ? (
                  <ActivityIndicator size="small" color={MATCHMAKER_HOME.primary} />
                ) : (
                  <MatchmakerReplyIcon reply={action.reply} />
                )}
                <Text style={styles.actionTitle} numberOfLines={1}>
                  {action.title}
                </Text>
                {!busy ? (
                  <View style={styles.actionChevron}>
                    <ChevronRight size={16} color={MATCHMAKER_HOME.subtleForeground} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        ))}
      </View>
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
    width: '100%',
    gap: SPACING.tight,
  },
  action: {
    width: '100%',
    minHeight: 56,
    borderColor: MATCHMAKER_HOME.border,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.compact,
    paddingVertical: SPACING.tight,
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    overflow: 'hidden',
  },
  actionContent: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionTitle: {
    flex: 1,
    flexShrink: 1,
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  actionChevron: {
    width: 28,
    height: 36,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.88,
    backgroundColor: MATCHMAKER_HOME.surfacePressed,
  },
  disabled: {
    opacity: 0.55,
  },
});
