import React, { useMemo } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { MOTION, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme } from '@/lib/onboarding-theme';

import { OnboardingHeader } from './onboarding-header';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { OnboardingScreenBackdrop } from './onboarding-screen-backdrop';

interface OnboardingScreenShellProps {
    stepIndex: number;
    stepLabel?: string;
    onBack?: () => void;
    title: React.ReactNode;
    subtitle?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    scrollable?: boolean;
    keyboardAvoiding?: boolean;
    contentContainerStyle?: StyleProp<ViewStyle>;
    /** Vertically center the main block — best for short forms like birthday/name. */
    centerContent?: boolean;
}

export function OnboardingScreenShell({
    stepIndex,
    stepLabel,
    onBack,
    title,
    subtitle,
    children,
    footer,
    scrollable = false,
    keyboardAvoiding = false,
    contentContainerStyle,
    centerContent = false,
}: OnboardingScreenShellProps) {
    const theme = useOnboardingTheme();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();

    const containerStyle = useMemo(
        () => ({
            paddingTop: insets.top + SPACING.compact,
            paddingBottom: Math.max(insets.bottom, SPACING.base),
        }),
        [insets.bottom, insets.top],
    );

    const topEntering = reducedMotion ? undefined : FadeInDown.delay(60).duration(MOTION.short);
    const mainEntering = reducedMotion ? undefined : FadeInUp.delay(100).duration(MOTION.short);
    const footerEntering = reducedMotion ? undefined : FadeInUp.delay(160).duration(MOTION.short);

    const heading = (
        <View style={styles.heading}>
            {typeof title === 'string' ? (
                <Text style={[styles.title, { color: theme.foreground }]}>{title}</Text>
            ) : (
                title
            )}
            {subtitle ? (
                <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>{subtitle}</Text>
            ) : null}
        </View>
    );

    const mainBlock = (
        <>
            {heading}
            <View style={[styles.body, contentContainerStyle]}>{children}</View>
        </>
    );

    return (
        <KeyboardAvoidingView
            style={[styles.container, containerStyle]}
            behavior={keyboardAvoiding && Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <OnboardingScreenBackdrop />

            <View style={styles.layout}>
                <Animated.View entering={topEntering} style={styles.topSection}>
                    <OnboardingProgressBar stepIndex={stepIndex} />
                    <OnboardingHeader stepIndex={stepIndex} stepLabel={stepLabel} onBack={onBack} />
                </Animated.View>

                {scrollable ? (
                    <ScrollView
                        style={styles.scroll}
                        contentContainerStyle={[
                            styles.scrollContent,
                            centerContent && styles.scrollContentCentered,
                        ]}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View entering={mainEntering} style={styles.main}>
                            {mainBlock}
                        </Animated.View>
                    </ScrollView>
                ) : (
                    <Animated.View
                        entering={mainEntering}
                        style={[styles.main, centerContent && styles.mainCentered]}
                    >
                        {mainBlock}
                    </Animated.View>
                )}

                {footer ? (
                    <Animated.View entering={footerEntering} style={styles.footer}>
                        {footer}
                    </Animated.View>
                ) : null}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.screenX,
    },
    layout: {
        flex: 1,
        justifyContent: 'space-between',
    },
    topSection: {
        gap: SPACING.base,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: SPACING.base,
    },
    scrollContentCentered: {
        justifyContent: 'center',
    },
    main: {
        flex: 1,
        gap: SPACING.comfortable,
        paddingTop: SPACING.section,
        width: '100%',
        alignSelf: 'stretch',
    },
    mainCentered: {
        justifyContent: 'center',
        paddingTop: 0,
    },
    heading: {
        gap: SPACING.tight,
    },
    title: {
        ...TYPOGRAPHY.display,
        fontSize: 24,
        lineHeight: 30,
        textAlign: 'left',
    },
    subtitle: {
        ...TYPOGRAPHY.callout,
        textAlign: 'left',
        maxWidth: 340,
    },
    body: {
        gap: SPACING.compact,
        width: '100%',
        alignSelf: 'stretch',
    },
    footer: {
        paddingTop: SPACING.compact,
        width: '100%',
    },
});
