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
            <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                <Animated.View
                    style={[
                        styles.fill,
                        fillStyle,
                        { backgroundColor: colors.primary },
                    ]}
                />
            </View>
            <Text style={[styles.scoreText, { color: colors.primary }]}>
                {score}%
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    track: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 3,
    },
    scoreText: {
        fontSize: 14,
        fontWeight: '700',
        minWidth: 38,
        textAlign: 'right',
    },
});
