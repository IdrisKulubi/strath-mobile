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
    onAskForDate: () => void;
    requestSent?: boolean;
    disabled?: boolean;
}

export function ProfileViewCta({ onAskForDate, requestSent = false, disabled = false }: ProfileViewCtaProps) {
    const { colors, isDark } = useTheme();
    const scale = useSharedValue(1);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePress = useCallback(() => {
        if (disabled || requestSent) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.value = withSpring(0.94, { damping: 10, stiffness: 300 }, () => {
            scale.value = withSpring(1);
        });
        onAskForDate();
    }, [disabled, requestSent, onAskForDate, scale]);

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
                    disabled={disabled || requestSent}
                    style={[
                        styles.btn,
                        requestSent
                            ? styles.btnSent
                            : { backgroundColor: colors.primary },
                        (disabled || requestSent) && styles.btnDisabled,
                    ]}
                >
                    <Text style={styles.btnText}>
                        {requestSent ? '✓ Invite Sent' : 'Send Date Invite 💜'}
                    </Text>
                </Pressable>
            </Animated.View>
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
