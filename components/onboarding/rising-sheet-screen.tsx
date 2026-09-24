import React, { useEffect, useRef } from 'react';
import {
    AccessibilityInfo,
    findNodeHandle,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text as RNText,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { HEIGHTS, MOTION, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

import { OnboardingProgressBar } from './onboarding-progress-bar';
import type { OnboardingScreenShellProps } from './onboarding-screen-shell';

/** The sheet is persistent; only the active beat content changes. */
export function RisingSheetScreen({
    stepIndex,
    beatKey = stepIndex,
    progressLabel = 'Your rhythm',
    progressIndex = 0,
    progressCount = 4,
    showProgress = true,
    sheetEntrance = true,
    previousAnswer,
    onBack,
    title,
    headingAccessory,
    subtitle,
    children,
    footer,
    keyboardAvoiding = true,
    contentContainerStyle,
}: OnboardingScreenShellProps) {
    const { colors, isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();
    const headingRef = useRef<RNText>(null);

    useEffect(() => {
        let active = true;
        const timer = setTimeout(() => {
            void AccessibilityInfo.isScreenReaderEnabled().then((enabled) => {
                if (!active || !enabled) return;
                const tag = findNodeHandle(headingRef.current);
                if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
            });
        }, reducedMotion ? 0 : MOTION.short);
        return () => { active = false; clearTimeout(timer); };
    }, [beatKey, reducedMotion]);

    const sheetEntry = reducedMotion || !sheetEntrance ? undefined : FadeInUp.duration(MOTION.short).easing(Easing.out(Easing.cubic));
    const beatEntry = reducedMotion ? undefined : FadeInUp.duration(200)
        .easing(Easing.out(Easing.cubic))
        .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });

    return (
        <KeyboardAvoidingView
            style={[styles.root, { backgroundColor: colors.background, paddingTop: insets.top }]}
            behavior={keyboardAvoiding && Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={[styles.header, { backgroundColor: isDark ? colors.card : colors.background }]}>
                <View style={styles.headerLine}>
                    {onBack ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Back to previous step"
                            onPress={onBack}
                            hitSlop={8}
                            style={[styles.back, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}
                        >
                            <Ionicons name="arrow-back" size={20} color={colors.foreground} />
                        </Pressable>
                    ) : <View style={styles.backPlaceholder} />}
                    <Text style={[styles.brand, { color: colors.foreground }]}>StrathSpace</Text>
                    <View style={styles.backPlaceholder} />
                </View>
                {showProgress ? (
                    <>
                        <Text style={[styles.progressTitle, { color: colors.mutedForeground }]}>{progressLabel}</Text>
                        <OnboardingProgressBar
                            stepIndex={stepIndex}
                            appearance="rising"
                            phaseIndex={progressIndex}
                            phaseCount={progressCount}
                            progressLabel={`${progressLabel}, chapter ${progressIndex + 1} of ${progressCount}`}
                        />
                    </>
                ) : null}
            </View>

            <Animated.View entering={sheetEntry} style={[styles.sheet, { backgroundColor: colors.sheet }]}>
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    showsVerticalScrollIndicator={false}
                >
                    {previousAnswer ? (
                        <View style={[styles.summary, { backgroundColor: colors.control, borderColor: colors.controlBorder }]}>
                            <View style={styles.summaryCopy}>
                                <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>{previousAnswer.label}</Text>
                                <Text style={[styles.summaryValue, { color: colors.foreground }]} numberOfLines={2}>{previousAnswer.value}</Text>
                            </View>
                            {previousAnswer.onEdit ? (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={`Edit ${previousAnswer.label}`}
                                    onPress={previousAnswer.onEdit}
                                    style={[styles.edit, { borderColor: colors.controlBorder }]}
                                >
                                    <Text style={[styles.editText, { color: colors.foreground }]}>Edit</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    ) : null}
                    <Animated.View key={beatKey} entering={beatEntry} style={[styles.beat, contentContainerStyle]}>
                        <View style={styles.heading}>
                            {headingAccessory}
                            {typeof title === 'string' ? (
                                <Text ref={headingRef} accessibilityRole="header" style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                            ) : (
                                <View accessible accessibilityRole="header">{title}</View>
                            )}
                            {subtitle ? <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text> : null}
                        </View>
                        <View style={styles.body}>{children}</View>
                    </Animated.View>
                </ScrollView>
                {footer ? (
                    <View style={[styles.footer, { backgroundColor: colors.sheet, paddingBottom: Math.max(insets.bottom, SPACING.base) }]}>
                        {footer}
                    </View>
                ) : <View style={{ height: Math.max(insets.bottom, SPACING.base) }} />}
            </Animated.View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    header: { paddingHorizontal: SPACING.screenX, paddingTop: SPACING.compact, paddingBottom: SPACING.section, gap: SPACING.tight },
    headerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    back: { width: HEIGHTS.touchMin, height: HEIGHTS.touchMin, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth },
    backPlaceholder: { width: HEIGHTS.touchMin, height: HEIGHTS.touchMin },
    brand: { ...TYPOGRAPHY.title, fontWeight: '700' },
    progressTitle: { ...TYPOGRAPHY.caption, textAlign: 'center' },
    sheet: { flex: 1, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.section, paddingTop: SPACING.comfortable, paddingBottom: SPACING.section },
    summary: { flexDirection: 'row', alignItems: 'center', borderRadius: RADIUS.row, borderWidth: StyleSheet.hairlineWidth, padding: SPACING.compact, marginBottom: SPACING.section },
    summaryCopy: { flex: 1, gap: SPACING.micro },
    summaryLabel: { ...TYPOGRAPHY.caption },
    summaryValue: { ...TYPOGRAPHY.body, fontWeight: '600' },
    edit: { minWidth: HEIGHTS.touchMin, minHeight: HEIGHTS.touchMin, borderWidth: StyleSheet.hairlineWidth, borderRadius: RADIUS.sm, alignItems: 'center', justifyContent: 'center', marginLeft: SPACING.tight },
    editText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
    beat: { flex: 1, gap: SPACING.section },
    heading: { gap: SPACING.tight, alignItems: 'center' },
    title: { ...TYPOGRAPHY.display, textAlign: 'center' },
    subtitle: { ...TYPOGRAPHY.callout, textAlign: 'center' },
    body: { gap: SPACING.compact },
    footer: { paddingHorizontal: SPACING.section, paddingTop: SPACING.compact },
});
