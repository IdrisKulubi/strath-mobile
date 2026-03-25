import React, { useEffect } from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    Easing,
    FadeInDown,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface CompletionProgressCardProps {
    percentage: number;
    promptText?: string;
    ctaText?: string;
    onPress?: () => void;
}

export function CompletionProgressCard({
    percentage,
    promptText = 'Complete your profile',
    ctaText,
    onPress,
}: CompletionProgressCardProps) {
    const { colors, isDark } = useTheme();
    const fillWidth = useSharedValue(0);

    useEffect(() => {
        fillWidth.value = withTiming(percentage / 100, {
            duration: 1200,
            easing: Easing.out(Easing.cubic),
        });
    }, [percentage, fillWidth]);

    const fillStyle = useAnimatedStyle(() => ({
        width: `${fillWidth.value * 100}%`,
    }));

    const remaining = Math.max(0, 100 - percentage);
    const thingsLeft = remaining > 0 ? Math.ceil(remaining / 20) : 0;
    const displayCta = ctaText ?? (thingsLeft > 0 ? `${thingsLeft} things left to unlock better matches` : 'Almost there!');

    return (
        <Animated.View entering={FadeInDown.delay(180).springify().damping(14)}>
            <Pressable
                onPress={onPress}
                disabled={!onPress}
                style={({ pressed }) => [
                    styles.card,
                    {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(233,30,140,0.12)',
                        opacity: pressed && onPress ? 0.9 : 1,
                    },
                    !isDark && styles.cardShadow,
                ]}
            >
                <LinearGradient
                    colors={isDark ? ['rgba(233,30,140,0.25)', 'rgba(192,38,211,0.2)'] : ['rgba(233,30,140,0.08)', 'rgba(192,38,211,0.06)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientBg}
                >
                    <View style={styles.header}>
                        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(233,30,140,0.3)' : 'rgba(233,30,140,0.15)' }]}>
                            <Ionicons name="sparkles" size={18} color={colors.primary} />
                        </View>
                        <View style={styles.textBlock}>
                            <Text style={[styles.prompt, { color: colors.foreground }]}>
                                {promptText}
                            </Text>
                            <Text style={[styles.cta, { color: colors.mutedForeground }]}>
                                {displayCta}
                            </Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: isDark ? 'rgba(233,30,140,0.4)' : 'rgba(233,30,140,0.2)' }]}>
                            <Text style={[styles.badgeText, { color: colors.primary }]}>
                                {percentage}%
                            </Text>
                        </View>
                    </View>
                    <View style={[styles.track, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(233,30,140,0.12)' }]}>
                        <Animated.View style={[styles.fill, fillStyle]}>
                            <LinearGradient
                                colors={['#ec4899', '#e91e8c']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                    </View>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        marginBottom: 20,
        borderRadius: 20,
        borderWidth: 1,
        overflow: 'hidden',
    },
    cardShadow: {
        shadowColor: '#e91e8c',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    gradientBg: {
        padding: 18,
        gap: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    textBlock: {
        flex: 1,
        gap: 2,
    },
    prompt: {
        fontSize: 16,
        fontWeight: '700',
    },
    cta: {
        fontSize: 13,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '800',
    },
    track: {
        height: 8,
        borderRadius: 999,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 999,
        overflow: 'hidden',
    },
});
