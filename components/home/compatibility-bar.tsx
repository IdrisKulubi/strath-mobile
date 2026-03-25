import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface CompatibilityBarProps {
    score: number;
    /** Delay before the fill animation starts, in ms */
    animationDelay?: number;
}

export function CompatibilityBar({ score, animationDelay = 0 }: CompatibilityBarProps) {
    const { colors, isDark } = useTheme();
    const fillWidth = useSharedValue(0);

    useEffect(() => {
        const timer = setTimeout(() => {
            fillWidth.value = withTiming(score, {
                duration: 700,
                easing: Easing.out(Easing.cubic),
            });
        }, animationDelay);
        return () => clearTimeout(timer);
    }, [score, animationDelay, fillWidth]);

    const fillStyle = useAnimatedStyle(() => ({
        width: `${fillWidth.value}%`,
    }));

    return (
        <View style={styles.container}>
            <Text style={[styles.label, { color: colors.foreground }]}>
                {score}% Vibe Match
            </Text>
            <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.06)' }]}>
                <Animated.View style={[styles.fill, fillStyle, { backgroundColor: '#e91e8c' }]} />
            </View>
            <Text style={[styles.helper, { color: colors.mutedForeground }]}>
                A strong curated fit for today
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 8,
    },
    label: {
        fontSize: 15,
        fontWeight: '700',
    },
    track: {
        height: 10,
        borderRadius: 999,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 999,
    },
    helper: {
        fontSize: 12,
        fontWeight: '500',
    },
});
