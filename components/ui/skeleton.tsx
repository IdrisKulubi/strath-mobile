/**
 * Skeleton — animated shimmer loading placeholder.
 *
 * Replaces the NativeWind animate-pulse version with a Reanimated
 * left-to-right shimmer that works in both light and dark mode.
 */

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
    borderRadius = 8,
    style,
}: SkeletonProps) {
    const { isDark } = useTheme();

    // Shimmer travels from -1 to +1 (relative to width)
    const translateX = useSharedValue(-1);

    useEffect(() => {
        translateX.value = withRepeat(
            withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
            -1,
            false,
        );
    }, [translateX]);

    const shimmerStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value * 300 }],
    }));

    const baseColor = isDark ? '#2d1b47' : '#e5e5e5';
    const shimmerLight = isDark
        ? ['rgba(72,41,97,0)', 'rgba(100,60,130,0.55)', 'rgba(72,41,97,0)']
        : ['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', 'rgba(255,255,255,0)'];

    return (
        <View
            style={[
                styles.base,
                { backgroundColor: baseColor, borderRadius },
                width !== undefined ? { width } : undefined,
                height !== undefined ? { height } : undefined,
                style,
            ]}
        >
            <Animated.View style={[StyleSheet.absoluteFill, shimmerStyle]}>
                <LinearGradient
                    colors={shimmerLight as [string, string, string]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={styles.shimmer}
                />
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    base: {
        overflow: 'hidden',
    },
    shimmer: {
        flex: 1,
        width: '150%',
    },
});
