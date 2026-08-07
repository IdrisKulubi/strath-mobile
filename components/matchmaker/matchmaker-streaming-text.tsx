import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { MATCHMAKER_HOME } from '@/lib/design-tokens';

const MIN_INTERVAL_MS = 28;
const MAX_INTERVAL_MS = 72;
const MAX_DURATION_MS = 4000;

interface MatchmakerStreamingTextProps {
  text: string;
  messageId?: string;
  style?: TextStyle | TextStyle[];
  animate?: boolean;
  showCursor?: boolean;
  onComplete?: () => void;
}

function splitWords(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  return trimmed.split(/\s+/);
}

function computeInterval(wordCount: number): number {
  if (wordCount <= 0) return MIN_INTERVAL_MS;
  const targetDuration = Math.min(MAX_DURATION_MS, wordCount * 42);
  return Math.min(MAX_INTERVAL_MS, Math.max(MIN_INTERVAL_MS, targetDuration / wordCount));
}

export function MatchmakerStreamingText({
  text,
  messageId,
  style,
  animate = true,
  showCursor = true,
  onComplete,
}: MatchmakerStreamingTextProps) {
  const reduceMotion = useReducedMotion();
  const words = useMemo(() => splitWords(text), [text]);
  const shouldAnimate = animate && !reduceMotion && words.length > 0;
  const [visibleCount, setVisibleCount] = useState(shouldAnimate ? 0 : words.length);
  const completedIds = useRef<Set<string>>(new Set());
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!shouldAnimate) {
      setVisibleCount(words.length);
      if (messageId && !completedIds.current.has(messageId)) {
        completedIds.current.add(messageId);
        onCompleteRef.current?.();
      }
      return;
    }

    if (messageId && completedIds.current.has(messageId)) {
      setVisibleCount(words.length);
      return;
    }

    setVisibleCount(0);
    let index = 0;
    const intervalMs = computeInterval(words.length);
    const timer = setInterval(() => {
      index += 1;
      setVisibleCount(index);
      if (index >= words.length) {
        clearInterval(timer);
        if (messageId) completedIds.current.add(messageId);
        onCompleteRef.current?.();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [messageId, shouldAnimate, words]);

  const displayed = words.slice(0, visibleCount).join(' ');
  const isStreaming = shouldAnimate && visibleCount < words.length;

  return (
    <Text style={style}>
      {displayed}
      {isStreaming && showCursor ? (
        <Text style={styles.cursor}>|</Text>
      ) : null}
    </Text>
  );
}

const styles = StyleSheet.create({
  cursor: {
    color: MATCHMAKER_HOME.mutedForeground,
    fontWeight: '300',
  },
});
