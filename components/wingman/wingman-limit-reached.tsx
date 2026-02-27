import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { ClockCountdown, ShieldCheck } from 'phosphor-react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface WingmanLimitReachedProps {
    message: string;
}

export function WingmanLimitReached({ message }: WingmanLimitReachedProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    return (
        <Animated.View entering={FadeIn.duration(260)} style={styles.limitContainer}>
            <Animated.View
                entering={SlideInUp.springify().damping(20)}
                style={[styles.limitCard, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.025)',
                    borderColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)',
                }]}
            >
                <View style={[styles.limitIconWrap, {
                    backgroundColor: isDark ? 'rgba(233,30,140,0.15)' : 'rgba(233,30,140,0.10)',
                }]}> 
                    <ClockCountdown size={24} color={colors.primary} weight="fill" />
                </View>

                <Text style={[styles.limitTitle, { color: colors.foreground }]}>Wingman daily limit reached</Text>
                <Text style={[styles.limitSubtitle, { color: colors.mutedForeground }]}>
                    You’ve used your Wingman searches for today.
                </Text>

                <View style={[styles.limitPill, {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                }]}>
                    <ShieldCheck size={14} color={colors.primary} weight="fill" />
                    <Text style={[styles.limitPillText, { color: colors.mutedForeground }]}>Resets tomorrow</Text>
                </View>

                <Text style={[styles.limitFinePrint, { color: colors.mutedForeground }]}>
                    This keeps recommendations high-quality and fair for everyone.
                </Text>

                <Text style={[styles.limitServerMessage, { color: colors.mutedForeground }]}>
                    {message}
                </Text>
            </Animated.View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    limitContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 16,
        paddingTop: 24,
    },
    limitCard: {
        borderWidth: 1,
        borderRadius: 20,
        paddingHorizontal: 18,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    limitIconWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    limitTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
        lineHeight: 25,
    },
    limitSubtitle: {
        fontSize: 14,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 20,
    },
    limitPill: {
        marginTop: 2,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
    },
    limitPillText: {
        fontSize: 12,
        fontWeight: '700',
    },
    limitFinePrint: {
        marginTop: 4,
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 18,
    },
    limitServerMessage: {
        marginTop: 2,
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8,
    },
});
