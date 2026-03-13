import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface StarRatingProps {
    value: number;
    onChange: (rating: number) => void;
    size?: number;
}

function Star({ filled, onPress, index, size }: {
    filled: boolean;
    onPress: (i: number) => void;
    index: number;
    size: number;
}) {
    const { colors } = useTheme();
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        scale.value = withSpring(1.4, { damping: 8, stiffness: 300 }, () => {
            scale.value = withSpring(1, { damping: 10, stiffness: 260 });
        });
        onPress(index + 1);
    }, [index, onPress, scale]);

    return (
        <Pressable onPress={handlePress} hitSlop={8}>
            <Animated.View style={animStyle}>
                <Ionicons
                    name={filled ? 'star' : 'star-outline'}
                    size={size}
                    color={filled ? '#f59e0b' : colors.mutedForeground}
                />
            </Animated.View>
        </Pressable>
    );
}

export function StarRating({ value, onChange, size = 40 }: StarRatingProps) {
    return (
        <View style={styles.row}>
            {[0, 1, 2, 3, 4].map((i) => (
                <Star
                    key={i}
                    index={i}
                    filled={i < value}
                    onPress={onChange}
                    size={size}
                />
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        gap: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
