import React, { createContext, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AccessibilityInfo,
    findNodeHandle,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text as RNText,
    TextInput,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { Easing, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { HEIGHTS, MOTION, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

import { OnboardingProgressBar } from './onboarding-progress-bar';
import { RisingHeaderProgressiveBlur } from './rising-header-progressive-blur';
import type { OnboardingScreenShellProps } from './onboarding-screen-shell';

const HEADER_FADE_TAIL = 14;

export const RisingKeyboardFocusContext = createContext<{
    registerFocusedInput: (input: TextInput | null) => void;
    revealFocusedInput: () => void;
} | null>(null);

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
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();
    const headingRef = useRef<RNText>(null);
    const scrollRef = useRef<ScrollView>(null);
    const focusedInputRef = useRef<TextInput | null>(null);
    const scrollOffsetRef = useRef(0);
    const keyboardTopRef = useRef<number | null>(null);
    const [keyboardScrollSpace, setKeyboardScrollSpace] = useState(0);
    const footerBottomInset = Math.max(insets.bottom, SPACING.base);
    const footerFallbackReserved = footer
        ? HEIGHTS.primaryControl + SPACING.compact + footerBottomInset
        : footerBottomInset;
    const [footerLayout, setFooterLayout] = useState<{ beat: string | number; height: number } | null>(null);
    const footerReserved = footerLayout?.beat === beatKey ? footerLayout.height : footerFallbackReserved;
    const headerChromeFallback = SPACING.compact
        + HEIGHTS.touchMin
        + (showProgress ? SPACING.tight + 18 + 4 : 0)
        + SPACING.section
        + insets.top;
    const [headerLayout, setHeaderLayout] = useState<{ beat: string | number; height: number } | null>(null);
    const headerChromeHeight = headerLayout?.beat === beatKey ? headerLayout.height : headerChromeFallback;
    const headerBlurHeight = headerChromeHeight + HEADER_FADE_TAIL;

    const revealFocusedInput = useCallback(() => {
        const input = TextInput.State.currentlyFocusedInput() ?? focusedInputRef.current;
        const scroll = scrollRef.current;
        if (!input || !scroll) return;
        const nativeScroll = scroll.getNativeScrollRef();
        if (!nativeScroll) return;
        input.measureInWindow((_inputX, inputY, _inputWidth, inputHeight) => {
            nativeScroll.measureInWindow((_scrollX, scrollY, _scrollWidth, scrollHeight) => {
                const footerClearance = footer ? footerReserved : 0;
                const visibleBottom = Math.min(scrollY + scrollHeight, keyboardTopRef.current ?? Infinity) - footerClearance - SPACING.compact;
                const overflow = inputY + inputHeight - visibleBottom;
                if (overflow > 0) {
                    const nextOffset = scrollOffsetRef.current + overflow;
                    scrollOffsetRef.current = nextOffset;
                    scroll.scrollTo({ y: nextOffset, animated: true });
                }
            });
        });
    }, [footer, footerReserved]);

    const registerFocusedInput = useCallback((input: TextInput | null) => {
        focusedInputRef.current = input;
        if (input) setTimeout(revealFocusedInput, 80);
    }, [revealFocusedInput]);
    const keyboardFocus = useMemo(() => ({ registerFocusedInput, revealFocusedInput }), [registerFocusedInput, revealFocusedInput]);

    useEffect(() => {
        const shown = Keyboard.addListener('keyboardDidShow', (event) => {
            keyboardTopRef.current = event.endCoordinates.screenY;
            setKeyboardScrollSpace(Math.max(HEIGHTS.input * 2, Math.min(event.endCoordinates.height, 300)));
            setTimeout(revealFocusedInput, 60);
        });
        const hidden = Keyboard.addListener('keyboardDidHide', () => { keyboardTopRef.current = null; setKeyboardScrollSpace(0); });
        return () => { shown.remove(); hidden.remove(); };
    }, [revealFocusedInput]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ y: 0, animated: false });
        scrollOffsetRef.current = 0;
    }, [beatKey]);

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
            style={[styles.root, { backgroundColor: colors.background }]}
            behavior={keyboardAvoiding && Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <RisingKeyboardFocusContext.Provider value={keyboardFocus}>
            <Animated.View entering={sheetEntry} style={[styles.sheet, { backgroundColor: colors.sheet }]}>
                <View style={styles.sheetBody}>
                <ScrollView
                    key={String(beatKey)}
                    ref={scrollRef}
                    style={styles.scroll}
                    contentContainerStyle={[
                        styles.scrollContent,
                        {
                            paddingTop: headerChromeHeight + SPACING.comfortable,
                            paddingBottom: SPACING.section + keyboardScrollSpace + (footer ? footerReserved : 0),
                        },
                    ]}
                    onScroll={(event) => { scrollOffsetRef.current = event.nativeEvent.contentOffset.y; }}
                    scrollEventThrottle={16}
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
                    <View
                        key={`footer-${String(beatKey)}`}
                        pointerEvents="box-none"
                        onLayout={(event) => {
                            setFooterLayout({ beat: beatKey, height: event.nativeEvent.layout.height });
                        }}
                        style={[styles.floatingFooter, { paddingBottom: footerBottomInset, paddingHorizontal: SPACING.screenX }]}
                    >
                        {footer}
                    </View>
                ) : <View style={{ height: footerBottomInset }} />}
                </View>
            </Animated.View>

            <View pointerEvents="box-none" style={styles.headerOverlay}>
                <RisingHeaderProgressiveBlur height={headerBlurHeight} />
                <View
                    key={`header-${String(beatKey)}`}
                    onLayout={(event) => {
                        setHeaderLayout({ beat: beatKey, height: event.nativeEvent.layout.height });
                    }}
                    style={[styles.header, { paddingTop: insets.top + SPACING.compact }]}
                >
                    <View style={styles.headerLine}>
                        {onBack ? (
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel="Back to previous step"
                                onPress={onBack}
                                hitSlop={8}
                                style={[styles.back, { backgroundColor: colors.risingGlassOverlay, borderColor: colors.controlBorder }]}
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
            </View>
            </RisingKeyboardFocusContext.Provider>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
    headerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 20,
    },
    header: { paddingHorizontal: SPACING.screenX, paddingBottom: SPACING.section, gap: SPACING.tight },
    headerLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    back: { width: HEIGHTS.touchMin, height: HEIGHTS.touchMin, alignItems: 'center', justifyContent: 'center', borderRadius: RADIUS.full, borderWidth: StyleSheet.hairlineWidth },
    backPlaceholder: { width: HEIGHTS.touchMin, height: HEIGHTS.touchMin },
    brand: { ...TYPOGRAPHY.title, fontWeight: '700' },
    progressTitle: { ...TYPOGRAPHY.caption, textAlign: 'center' },
    sheet: { flex: 1, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, overflow: 'hidden' },
    sheetBody: { flex: 1, position: 'relative' },
    scroll: { flex: 1 },
    scrollContent: { flexGrow: 1, paddingHorizontal: SPACING.section, paddingBottom: SPACING.section },
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
    floatingFooter: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        paddingTop: SPACING.compact,
    },
});
