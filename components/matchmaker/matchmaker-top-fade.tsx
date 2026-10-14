import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { MATCHMAKER_FLOATING_HEADER_HEIGHT } from '@/components/matchmaker/matchmaker-header';

/** Short fade band tucked under the status bar + header. */
const FADE_TAIL = 14;

interface MatchmakerTopFadeProps {
  topInset: number;
}

/**
 * Soft top scrim so conversation content appears to fade out as it scrolls
 * beneath the floating header — similar to Grok-style chat chrome.
 */
export function MatchmakerTopFade({ topInset }: MatchmakerTopFadeProps) {
  const height = topInset + MATCHMAKER_FLOATING_HEADER_HEIGHT * 0.55 + FADE_TAIL;

  return (
    <View pointerEvents="none" style={[styles.host, { height }]}>
      {Platform.OS === 'ios' ? (
        <BlurView
          intensity={6}
          tint="dark"
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      <LinearGradient
        colors={[
          'rgba(22, 12, 31, 0.28)',
          'rgba(42, 20, 48, 0.16)',
          'rgba(58, 24, 64, 0.07)',
          'transparent',
        ]}
        locations={[0, 0.35, 0.68, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 15,
  },
});
