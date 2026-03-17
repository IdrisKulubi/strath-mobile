import React, { useCallback } from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface ProfileActionBarProps {
    onEditPress: () => void;
}

export function ProfileActionBar({ onEditPress }: ProfileActionBarProps) {
    const { colors, isDark } = useTheme();
    const scale = useSharedValue(1);

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        scale.value = withSpring(0.96, { damping: 12, stiffness: 300 }, () => {
            scale.value = withSpring(1);
        });
        onEditPress();
    }, [onEditPress, scale]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(400).springify().damping(14)}
            style={[styles.wrap, { paddingBottom: Platform.OS === 'ios' ? 100 : 90 }]}
        >
            <Animated.View style={animStyle}>
                <Pressable onPress={handlePress} style={({ pressed }) => [{ opacity: pressed ? 0.95 : 1 }]}>
                    <LinearGradient
                        colors={isDark ? ['#3d2459', '#2d1b47'] : ['#ec4899', '#e91e8c']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[
                            styles.btn,
                            !isDark && styles.btnShadow,
                        ]}
                    >
                        <Ionicons name="pencil" size={18} color="#fff" style={styles.btnIcon} />
                        <Text style={styles.btnText}>Edit Profile</Text>
                    </LinearGradient>
                </Pressable>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 8,
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 28,
        borderRadius: 999,
        minWidth: 180,
    },
    btnShadow: {
        shadowColor: '#e91e8c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 8,
    },
    btnIcon: {
        marginRight: 8,
    },
    btnText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
});
