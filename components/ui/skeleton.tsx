import React, { useEffect } from 'react';
import { View, DimensionValue, ViewStyle, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks/use-theme';
import { RADIUS } from '@/lib/design-tokens';

interface SkeletonProps {
  width?: DimensionValue;
  height?: DimensionValue;
  borderRadius?: number;
  style?: ViewStyle;
  className?: string;
}

export function Skeleton({
  width,
  height,
  borderRadius = RADIUS.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(-1);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(1, { duration: 1200, easing: Easing.out(Easing.cubic) }),
      -1,
      false,
    );
  }, [translateX]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value * 300 }],
  }));

  const shimmerStops = [
    'rgba(128,128,128,0)',
    'rgba(128,128,128,0.12)',
    'rgba(128,128,128,0)',
  ] as [string, string, string];

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: colors.muted, borderRadius },
        width !== undefined ? { width } : undefined,
        height !== undefined ? { height } : undefined,
        style,
      ]}
    >
      <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
        <LinearGradient
          colors={shimmerStops}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.shimmer}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { overflow: 'hidden' },
  shimmer: { flex: 1, width: '150%' },
});
