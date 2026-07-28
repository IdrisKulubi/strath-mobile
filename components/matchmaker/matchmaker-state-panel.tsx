import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Clock3, RefreshCw, SearchX, WifiOff } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME, RADIUS, SPACING } from '@/lib/design-tokens';

type MatchmakerStateVariant = 'loading' | 'error' | 'inline_error' | 'limit' | 'no_result';

interface MatchmakerStatePanelProps {
  variant: MatchmakerStateVariant;
  title?: string;
  body?: string;
  replies?: string[];
  busy?: boolean;
  onRetry?: () => void;
  onReply?: (reply: string) => void;
}

function defaultCopy(variant: MatchmakerStateVariant) {
  if (variant === 'loading') {
    return {
      title: 'Opening your matchmaker',
      body: 'Keeping your previous context ready.',
    };
  }

  if (variant === 'limit') {
    return {
      title: 'That is enough searching for today',
      body: 'I saved what I learned, so tomorrow can start from a better place.',
    };
  }

  if (variant === 'no_result') {
    return {
      title: 'That request is narrow',
      body: 'Change one part of it and I can search again without losing the direction.',
    };
  }

  return {
    title: 'Connection problem',
    body: 'Your conversation is still here. Try again when the network settles.',
  };
}

function StateIcon({ variant }: { variant: MatchmakerStateVariant }) {
  if (variant === 'loading') return <ActivityIndicator size="small" color={MATCHMAKER_HOME.primary} />;
  if (variant === 'limit') return <Clock3 size={17} color={MATCHMAKER_HOME.warning} />;
  if (variant === 'no_result') return <SearchX size={17} color={MATCHMAKER_HOME.primary} />;
  return <WifiOff size={17} color={MATCHMAKER_HOME.error} />;
}

export function MatchmakerStatePanel({
  variant,
  title,
  body,
  replies = [],
  busy = false,
  onRetry,
  onReply,
}: MatchmakerStatePanelProps) {
  const copy = defaultCopy(variant);
  const canRetry = Boolean(onRetry) && (variant === 'error' || variant === 'inline_error');

  return (
    <View
      accessibilityRole={variant === 'loading' ? 'progressbar' : 'summary'}
      accessibilityLabel={`${title ?? copy.title}. ${body ?? copy.body}`}
      style={styles.wrap}
    >
      <View style={styles.headerRow}>
        <View style={styles.icon}>
          <StateIcon variant={variant} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{title ?? copy.title}</Text>
          <Text style={styles.body}>{body ?? copy.body}</Text>
        </View>
      </View>

      {variant === 'loading' ? (
        <View style={styles.skeletonStack}>
          {[0, 1, 2].map((item) => (
            <View
              key={item}
              style={[
                styles.skeletonLine,
                item === 2 && styles.skeletonLineShort,
                { backgroundColor: MATCHMAKER_HOME.surface },
              ]}
            />
          ))}
        </View>
      ) : null}

      {canRetry ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try again"
          accessibilityHint="Retries loading the matchmaker conversation."
          disabled={busy}
          onPress={onRetry}
          style={({ pressed }) => [
              styles.retry,
              styles.retrySurface,
              pressed && !busy && styles.pressed,
              busy && styles.disabled,
            ]}
        >
          {busy ? (
            <ActivityIndicator size="small" color={MATCHMAKER_HOME.primary} />
          ) : (
            <RefreshCw size={15} color={MATCHMAKER_HOME.primary} />
          )}
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      ) : null}

      {replies.length > 0 ? (
        <View style={styles.replies}>
          {replies.map((reply) => (
            <Pressable
              key={reply}
              accessibilityRole="button"
              accessibilityLabel={reply}
              disabled={busy}
              onPress={() => onReply?.(reply)}
              style={({ pressed }) => [
                  styles.reply,
                  styles.replySurface,
                  pressed && !busy && styles.pressed,
                  busy && styles.disabled,
                ]}
            >
              <Text style={styles.replyText}>{reply}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: MATCHMAKER_HOME.backgroundRaised,
    borderColor: MATCHMAKER_HOME.border,
    minHeight: 148,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.compact,
    gap: SPACING.compact,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.tight,
  },
  icon: {
    backgroundColor: MATCHMAKER_HOME.surface,
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  body: {
    color: MATCHMAKER_HOME.mutedForeground,
    marginTop: 2,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  skeletonStack: {
    gap: SPACING.tight,
  },
  skeletonLine: {
    height: 12,
    borderRadius: RADIUS.full,
  },
  skeletonLineShort: {
    width: '64%',
  },
  retry: {
    minHeight: 44,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.tight,
  },
  retrySurface: {
    backgroundColor: MATCHMAKER_HOME.surface,
    borderColor: MATCHMAKER_HOME.border,
  },
  retryText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  replies: {
    gap: SPACING.tight,
  },
  reply: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: 13,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replySurface: {
    backgroundColor: MATCHMAKER_HOME.surface,
    borderColor: MATCHMAKER_HOME.border,
  },
  replyText: {
    color: MATCHMAKER_HOME.foreground,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.55,
  },
});
