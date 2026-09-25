import React from 'react';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';

import { MOTION } from '@/lib/design-tokens';

export function BeatReveal({ children }: { children: React.ReactNode }) {
  const reduceMotion = useReducedMotion();
  if (reduceMotion) return <>{children}</>;
  return <Animated.View entering={FadeInUp.duration(MOTION.short)}>{children}</Animated.View>;
}
