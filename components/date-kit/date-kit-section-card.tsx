import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
    FadeInDown,
    FadeIn,
    LinearTransition,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DateKitTipPill } from './date-kit-tip-pill';

interface DateKitSectionCardProps {
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    steps: string[];
    tips: string[];
    accent: string;
    expanded: boolean;
    delay?: number;
    onPress: () => void;
}

export function DateKitSectionCard({
    title,
    subtitle,
    icon,
    steps,
    tips,
    accent,
    expanded,
    delay = 0,
    onPress,
}: DateKitSectionCardProps) {
    const { colors, isDark } = useTheme();
    const chevronRotation = useSharedValue(expanded ? 1 : 0);

    useEffect(() => {
        chevronRotation.value = withTiming(expanded ? 1 : 0, { duration: 180 });
    }, [expanded, chevronRotation]);

    const chevronStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${chevronRotation.value * 180}deg` }],
    }));

    return (
        <Animated.View
            entering={FadeInDown.delay(delay).springify().damping(14)}
            layout={LinearTransition.springify().damping(18)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? colors.card : '#fff',
                    borderColor: colors.border,
                },
            ]}
        >
            <Pressable onPress={onPress} style={styles.header}>
                <View style={styles.headerLeft}>
                    <View style={[styles.iconWrap, { backgroundColor: `${accent}18` }]}>
                        <Ionicons name={icon} size={18} color={accent} />
                    </View>
                    <View style={styles.headerText}>
                        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
                    </View>
                </View>
                <Animated.View style={chevronStyle}>
                    <Ionicons name="chevron-down" size={20} color={colors.mutedForeground} />
                </Animated.View>
            </Pressable>

            {expanded ? (
                <Animated.View entering={FadeIn.duration(160)} style={styles.body}>
                    <View style={styles.stepsWrap}>
                        {steps.map((step, index) => (
                            <View key={step} style={styles.stepRow}>
                                <View style={[styles.stepBadge, { backgroundColor: accent }]}>
                                    <Text style={styles.stepBadgeText}>{index + 1}</Text>
                                </View>
                                <Text style={[styles.stepText, { color: colors.foreground }]}>
                                    {step}
                                </Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.tipsWrap}>
                        {tips.map((tip) => (
                            <DateKitTipPill key={tip} label={tip} />
                        ))}
                    </View>
                </Animated.View>
            ) : null}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
        gap: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    headerLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerText: {
        flex: 1,
        gap: 3,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
    },
    subtitle: {
        fontSize: 13,
        lineHeight: 18,
    },
    body: {
        gap: 14,
    },
    stepsWrap: {
        gap: 12,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    stepBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    stepBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    tipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
});
