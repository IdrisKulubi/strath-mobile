import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface ProfileViewCtaProps {
    onOpenToMeet: () => void;
    onPass?: () => void;
    disabled?: boolean;
    completed?: boolean;
    label?: string;
}

export function ProfileViewCta({
    onOpenToMeet,
    onPass,
    disabled = false,
    completed = false,
    label = 'Open to Meet',
}: ProfileViewCtaProps) {
    const { colors, isDark } = useTheme();
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        if (disabled || completed) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            scale.value = withSpring(1);
        });
        onOpenToMeet();
    }, [completed, disabled, onOpenToMeet, scale]);

    return (
        <View
            style={[
                styles.container,
                {
                    backgroundColor: isDark ? colors.background : '#fff',
                    borderTopColor: colors.border,
                },
            ]}
        >
            <Animated.View style={[styles.btnWrap, animStyle]}>
                <Pressable
                    onPress={handlePress}
                    disabled={disabled || completed}
                    style={[
                        styles.btn,
                        completed
                            ? styles.btnSent
                            : { backgroundColor: colors.primary },
                        (disabled || completed) && styles.btnDisabled,
                    ]}
                >
                    <Text style={styles.btnText}>
                        {completed ? 'Decision Saved ✓' : label}
                    </Text>
                </Pressable>
            </Animated.View>
            {onPass && !completed && !disabled && (
                <Pressable onPress={onPass} style={styles.passWrap}>
                    <Text style={[styles.passText, { color: colors.mutedForeground }]}>
                        Pass
                    </Text>
                </Pressable>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 32 : 16,
        borderTopWidth: 1,
    },
    btnWrap: {
        width: '100%',
    },
    passWrap: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 4,
    },
    passText: {
        fontSize: 14,
        fontWeight: '600',
    },
    btn: {
        borderRadius: 16,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 54,
    },
    btnSent: {
        backgroundColor: '#10b981',
    },
    btnDisabled: {
        opacity: 0.65,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
