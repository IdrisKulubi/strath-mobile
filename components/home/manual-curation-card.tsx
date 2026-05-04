import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { ManualCuration } from '@/hooks/use-daily-matches';

interface ManualCurationCardProps {
    curation?: ManualCuration | null;
}

export function ManualCurationCard({ curation }: ManualCurationCardProps) {
    const { colors, isDark } = useTheme();
    const title = curation?.title ?? 'We are working on your match';
    const subtitle = curation?.subtitle
        ?? 'Our team is reviewing profiles by hand so we can introduce you to someone with real potential. When we find a strong fit, we will send them to you first.';

    const cardBg = isDark ? 'rgba(35, 25, 48, 0.92)' : '#ffffff';
    const borderColor = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)';
    const gradientColors = isDark
        ? (['rgba(233,30,140,0.24)', 'rgba(35,25,48,0.04)'] as const)
        : (['rgba(233,30,140,0.10)', 'rgba(255,255,255,0.4)'] as const);

    return (
        <Animated.View entering={FadeInDown.duration(360)} style={styles.outer}>
            <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
                <LinearGradient
                    colors={gradientColors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                <View style={styles.content}>
                    <View style={[styles.iconBox, { backgroundColor: colors.primary }]}>
                        <Ionicons name="sparkles" size={24} color={colors.primaryForeground} />
                    </View>

                    <Text style={[styles.eyebrow, { color: colors.primary }]}>Personal matching is on</Text>
                    <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                    <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>

                    <View style={[styles.steps, { borderTopColor: colors.border }]}>
                        <Step text="We review your profile and preferences" />
                        <Step text="We look for someone who feels genuinely compatible" />
                        <Step text="We will notify you when your match is ready" />
                    </View>

                    <View style={[styles.notice, { borderColor, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(15,23,42,0.03)' }]}>
                        <Ionicons name="lock-closed-outline" size={16} color={colors.mutedForeground} />
                        <Text style={[styles.noticeText, { color: colors.mutedForeground }]}>
                            You do not need to browse profiles right now. We are handling the search for you.
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
}


function Step({ text }: { text: string }) {
    const { colors } = useTheme();
    return (
        <View style={styles.stepRow}>
            <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={styles.stepIcon} />
            <Text style={[styles.stepText, { color: colors.foreground }]}>{text}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    outer: {
        paddingHorizontal: 18,
        paddingTop: 8,
        paddingBottom: 8,
    },
    card: {
        borderRadius: 24,
        borderWidth: 1,
        overflow: 'hidden',
    },
    content: {
        paddingHorizontal: 22,
        paddingVertical: 26,
        gap: 12,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    eyebrow: {
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    title: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '800',
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
    },
    steps: {
        marginTop: 8,
        paddingTop: 16,
        gap: 12,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    stepIcon: {
        marginTop: 1,
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '600',
    },
    notice: {
        marginTop: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    noticeText: {
        flex: 1,
        fontSize: 12,
        lineHeight: 17,
        fontWeight: '500',
    },
});
