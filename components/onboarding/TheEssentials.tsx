import React, { useEffect, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInUp, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { essentialsStepLabel } from '@/constants/onboarding';
import { MOTION, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme } from '@/lib/onboarding-theme';


import { OnboardingHeader } from './onboarding-header';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { OnboardingScreenBackdrop } from './onboarding-screen-backdrop';
import { PhoneNumberStep } from './phone-number-step';

interface TheEssentialsProps {
    data: {
        firstName: string;
        lastName: string;
        phoneNumber: string;
    };
    onUpdate: (data: Partial<TheEssentialsProps['data']>) => void;
    onNext: () => void;
}

export function TheEssentials({ data, onUpdate, onNext }: TheEssentialsProps) {
    const theme = useOnboardingTheme();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();

    const hasPrefilledName =
        (data.firstName || '').trim().length >= 2 && (data.lastName || '').trim().length >= 2;
    const [step, setStep] = useState(hasPrefilledName ? 1 : 0);
    const [firstName, setFirstName] = useState(data.firstName || '');
    const [lastName, setLastName] = useState(data.lastName || '');

    useEffect(() => {
        const nextFirstName = data.firstName || '';
        const nextLastName = data.lastName || '';

        setFirstName((current) => current || nextFirstName);
        setLastName((current) => current || nextLastName);

        const hasName = nextFirstName.trim().length >= 2 && nextLastName.trim().length >= 2;
        if (hasName && step === 0) {
            onUpdate({ firstName: nextFirstName.trim(), lastName: nextLastName.trim() });
            setStep(1);
        }
    }, [data.firstName, data.lastName, onUpdate, step]);

    const isNameValid = firstName.trim().length >= 2 && lastName.trim().length >= 2;
    const mainEntering = reducedMotion ? undefined : FadeInUp.delay(100).duration(MOTION.short);
    const footerEntering = reducedMotion ? undefined : FadeInUp.delay(160).duration(MOTION.short);

    const handleNameContinue = () => {
        if (!isNameValid) {
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onUpdate({ firstName: firstName.trim(), lastName: lastName.trim() });
        setStep(1);
    };

    const handlePhoneContinue = (e164PhoneNumber: string) => {
        onUpdate({ phoneNumber: e164PhoneNumber });
        onNext();
    };

    if (step === 1) {
        return (
            <PhoneNumberStep
                initialPhoneNumber={data.phoneNumber}
                hasPrefilledName={hasPrefilledName}
                globalStepIndex={2}
                onBack={hasPrefilledName ? undefined : () => setStep(0)}
                onContinue={handlePhoneContinue}
            />
        );
    }

    return (
        <KeyboardAvoidingView
            style={[
                styles.container,
                {
                    paddingTop: insets.top + SPACING.compact,
                    paddingBottom: Math.max(insets.bottom, SPACING.base),
                },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <OnboardingScreenBackdrop />

            <View style={styles.layout}>
                <View style={styles.topSection}>
                    <OnboardingProgressBar stepIndex={2} />
                    <OnboardingHeader
                        stepIndex={2}
                        stepLabel={essentialsStepLabel(0, hasPrefilledName)}
                    />
                </View>

                <Animated.View entering={mainEntering} style={styles.main}>
                    <Text style={[styles.title, { color: theme.foreground }]}>
                        {"What's your name?"}
                    </Text>
                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                        This is how you will appear to others on campus.
                    </Text>

                    <View style={styles.inputGroup}>
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    color: theme.foreground,
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                            placeholder="First name"
                            placeholderTextColor={theme.mutedForeground}
                            value={firstName}
                            onChangeText={setFirstName}
                            autoFocus
                            autoCapitalize="words"
                            accessibilityLabel="First name"
                        />
                        <TextInput
                            style={[
                                styles.input,
                                {
                                    color: theme.foreground,
                                    backgroundColor: theme.surface,
                                    borderColor: theme.border,
                                },
                            ]}
                            placeholder="Last name"
                            placeholderTextColor={theme.mutedForeground}
                            value={lastName}
                            onChangeText={setLastName}
                            autoCapitalize="words"
                            accessibilityLabel="Last name"
                        />
                    </View>
                </Animated.View>

                <Animated.View entering={footerEntering} style={styles.footer}>
                    <OnboardingPrimaryButton
                        label="Continue"
                        onPress={handleNameContinue}
                        disabled={!isNameValid}
                    />
                </Animated.View>
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
    main: {
        flex: 1,
        justifyContent: 'center',
        gap: SPACING.base,
    },
    title: {
        ...TYPOGRAPHY.display,
        fontSize: 24,
        lineHeight: 30,
    },
    subtitle: {
        ...TYPOGRAPHY.callout,
    },
    inputGroup: {
        gap: SPACING.compact,
        marginTop: SPACING.compact,
    },
    input: {
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.base,
        fontSize: 17,
        minHeight: 56,
    },
    footer: {
        width: '100%',
    },
});
