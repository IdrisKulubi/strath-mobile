import React, { useEffect } from 'react';
import { StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import Animated, {
    Easing,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
} from 'react-native-reanimated';
import {
    ArrowRight,
    CaretRight,
    GraduationCap,
    Heart,
    InstagramLogo,
    MoonStars,
    Ruler,
    Sparkle,
    type Icon,
} from 'phosphor-react-native';

import { useTheme } from '@/hooks/use-theme';
import { MOTION, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import type { ProfileCompletionTask, ProfileCompletionTaskId } from '@/lib/profile-completion';

interface GuidedCompletionPathProps {
    percentage: number;
    tasks: ProfileCompletionTask[];
    onContinue: (task: ProfileCompletionTask) => void;
}

const TASK_ICONS: Record<ProfileCompletionTaskId, Icon> = {
    education: GraduationCap,
    dating: Heart,
    personality: Sparkle,
    lifestyle: MoonStars,
    details: Ruler,
    socials: InstagramLogo,
};

function getContinueLabel(task: ProfileCompletionTask): string {
    if (task.id === 'details') return 'Continue with your details';
    if (task.id === 'socials') return 'Continue with socials';
    return `Continue with ${task.title.toLowerCase()}`;
}

export function GuidedCompletionPath({ percentage, tasks, onContinue }: GuidedCompletionPathProps) {
    const { colors, isDark } = useTheme();
    const progress = useSharedValue(0);
    const clampedPercentage = Math.min(100, Math.max(0, percentage));
    const visibleTasks = tasks.slice(0, 3);
    const nextTask = visibleTasks[0];
    const remainingCount = Math.max(0, tasks.length - visibleTasks.length);

    useEffect(() => {
        progress.value = withTiming(clampedPercentage / 100, {
            duration: 700,
            easing: Easing.out(Easing.cubic),
        });
    }, [clampedPercentage, progress]);

    const fillStyle = useAnimatedStyle(() => ({
        width: `${Math.max(progress.value, 0.02) * 100}%`,
    }));

    if (!nextTask) return null;

    return (
        <Animated.View
            entering={FadeInDown.duration(MOTION.medium)}
            style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
            <View style={styles.headingRow}>
                <View style={styles.headingCopy}>
                    <RNText style={[styles.eyebrow, { color: colors.mutedForeground }]}>Your match profile</RNText>
                    <RNText style={[styles.title, { color: colors.foreground }]}>Help the right people find you</RNText>
                </View>
                <View style={styles.percentageBlock}>
                    <RNText style={[styles.percentage, { color: colors.primary }]}>{clampedPercentage}%</RNText>
                    <RNText style={[styles.percentageLabel, { color: colors.mutedForeground }]}>complete</RNText>
                </View>
            </View>

            <RNText style={[styles.description, { color: colors.mutedForeground }]}>A few details help us recommend people who fit your life, values and dating goals.</RNText>

            <View style={[styles.track, { backgroundColor: colors.muted }]}>
                <Animated.View style={[styles.fill, fillStyle, { backgroundColor: colors.primary }]} />
            </View>

            <View style={styles.taskList}>
                {visibleTasks.map((task) => {
                    const TaskIcon = TASK_ICONS[task.id];
                    return (
                        <TouchableOpacity
                            key={task.id}
                            onPress={() => onContinue(task)}
                            accessibilityRole="button"
                            accessibilityLabel={`${task.title}. ${task.detail}. About ${task.estimate}.`}
                            activeOpacity={0.68}
                            style={[styles.taskRow, { borderTopColor: colors.border }]}
                        >
                            <View style={[styles.taskIcon, { backgroundColor: isDark ? colors.muted : colors.secondary }]}>
                                <TaskIcon size={18} color={colors.primary} weight="bold" />
                            </View>
                            <View style={styles.taskCopy}>
                                <RNText
                                    style={[styles.taskTitle, { color: colors.foreground }]}
                                    numberOfLines={1}
                                    maxFontSizeMultiplier={1.25}
                                >
                                    {task.title}
                                </RNText>
                                <RNText
                                    style={[styles.taskDetail, { color: colors.mutedForeground }]}
                                    numberOfLines={1}
                                    maxFontSizeMultiplier={1.2}
                                >
                                    {task.detail}
                                </RNText>
                            </View>
                            <View style={styles.taskMeta}>
                                <RNText
                                    style={[styles.taskEstimate, { color: colors.mutedForeground }]}
                                    numberOfLines={1}
                                    maxFontSizeMultiplier={1.15}
                                >
                                    {task.estimate}
                                </RNText>
                                <CaretRight size={16} color={colors.mutedForeground} weight="bold" />
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {remainingCount > 0 ? (
                <RNText style={[styles.remaining, { color: colors.mutedForeground }]}>
                    +{remainingCount} more {remainingCount === 1 ? 'section' : 'sections'} after these
                </RNText>
            ) : null}

            <TouchableOpacity
                onPress={() => onContinue(nextTask)}
                accessibilityRole="button"
                accessibilityLabel={getContinueLabel(nextTask)}
                activeOpacity={0.84}
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
            >
                <RNText
                    style={[styles.primaryButtonText, { color: colors.primaryForeground }]}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.86}
                    maxFontSizeMultiplier={1.2}
                >
                    {getContinueLabel(nextTask)}
                </RNText>
                <ArrowRight size={18} color={colors.primaryForeground} weight="bold" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    section: {
        marginTop: SPACING.compact,
        marginBottom: SPACING.section,
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.section,
        paddingBottom: SPACING.comfortable,
        borderTopWidth: 1,
        borderBottomWidth: 1,
    },
    headingRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: SPACING.base,
    },
    headingCopy: { flex: 1 },
    eyebrow: { ...TYPOGRAPHY.label, fontWeight: '600', marginBottom: SPACING.micro },
    title: { ...TYPOGRAPHY.title, fontWeight: '700', maxWidth: 260 },
    percentageBlock: { alignItems: 'flex-end', paddingTop: SPACING.micro },
    percentage: { ...TYPOGRAPHY.headline, fontWeight: '700' },
    percentageLabel: { ...TYPOGRAPHY.label },
    description: { ...TYPOGRAPHY.caption, maxWidth: 340, marginTop: SPACING.compact },
    track: { height: 6, borderRadius: RADIUS.full, overflow: 'hidden', marginTop: SPACING.base },
    fill: { height: '100%', minWidth: 8, borderRadius: RADIUS.full },
    taskList: { marginTop: SPACING.compact },
    taskRow: {
        width: '100%',
        minHeight: 64,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingVertical: SPACING.tight,
    },
    taskIcon: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    taskCopy: { flex: 1, minWidth: 0 },
    taskTitle: { ...TYPOGRAPHY.callout, fontWeight: '600' },
    taskDetail: { ...TYPOGRAPHY.label, marginTop: 2 },
    taskMeta: { flexDirection: 'row', alignItems: 'center', gap: SPACING.micro, flexShrink: 0 },
    taskEstimate: { ...TYPOGRAPHY.label },
    remaining: { ...TYPOGRAPHY.label, marginBottom: SPACING.compact },
    primaryButton: {
        width: '100%',
        minHeight: 50,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.base,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.tight,
        overflow: 'hidden',
    },
    primaryButtonText: { ...TYPOGRAPHY.callout, fontWeight: '700', flexShrink: 1 },
});
