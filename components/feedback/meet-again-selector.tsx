import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { MeetAgain } from '@/hooks/use-date-feedback';

const OPTIONS: { value: MeetAgain; label: string; emoji: string }[] = [
    { value: 'yes', label: 'Yes, definitely', emoji: '💜' },
    { value: 'maybe', label: 'Maybe', emoji: '🤔' },
    { value: 'no', label: 'Not really', emoji: '👋' },
];

interface MeetAgainSelectorProps {
    value: MeetAgain | null;
    onChange: (v: MeetAgain) => void;
}

export function MeetAgainSelector({ value, onChange }: MeetAgainSelectorProps) {
    const { colors, isDark } = useTheme();

    return (
        <View style={styles.container}>
            {OPTIONS.map((opt) => {
                const isSelected = value === opt.value;
                const scale = useSharedValue(1);

                const animStyle = useAnimatedStyle(() => ({
                    transform: [{ scale: scale.value }],
                }));

                const handlePress = useCallback(() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    scale.value = withSpring(0.93, { damping: 10, stiffness: 300 }, () => {
                        scale.value = withSpring(1);
                    });
                    onChange(opt.value);
                }, []);

                return (
                    <Animated.View key={opt.value} style={[styles.optWrap, animStyle]}>
                        <Pressable
                            onPress={handlePress}
                            style={[
                                styles.option,
                                {
                                    backgroundColor: isSelected
                                        ? colors.primary + '18'
                                        : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                    borderColor: isSelected ? colors.primary : colors.border,
                                    borderWidth: isSelected ? 2 : 1,
                                },
                            ]}
                        >
                            <Text style={styles.emoji}>{opt.emoji}</Text>
                            <Text style={[
                                styles.label,
                                {
                                    color: isSelected ? colors.primary : colors.foreground,
                                    fontWeight: isSelected ? '700' : '500',
                                },
                            ]}>
                                {opt.label}
                            </Text>
                        </Pressable>
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: 10,
        width: '100%',
    },
    optWrap: {
        width: '100%',
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderRadius: 16,
        paddingVertical: 14,
        paddingHorizontal: 18,
    },
    emoji: {
        fontSize: 22,
    },
    label: {
        fontSize: 15,
    },
});
