import React, { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import {
    coreProfileStepLabel,
    DATING_GOAL_OPTIONS,
    GENDER_IDENTITY_OPTIONS,
    MATCH_PREFERENCE_OPTIONS,
} from '@/constants/onboarding';
import { Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';


import { OnboardingChoiceRow } from './onboarding-choice-row';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';

interface CoreProfileData {
    age: number | string;
    zodiacSign: string;
    gender: string;
    lookingFor: string;
    relationshipGoal: string;
}

interface CoreProfileStepProps {
    globalStepIndex: number;
    data: CoreProfileData;
    onUpdate: (updates: Partial<CoreProfileData>) => void;
    onComplete: () => void;
    onBackToEssentials: () => void;
}

const getZodiacSign = (month: number, day: number): string => {
    const signs = [
        { name: 'Capricorn', start: [12, 22], end: [1, 19] },
        { name: 'Aquarius', start: [1, 20], end: [2, 18] },
        { name: 'Pisces', start: [2, 19], end: [3, 20] },
        { name: 'Aries', start: [3, 21], end: [4, 19] },
        { name: 'Taurus', start: [4, 20], end: [5, 20] },
        { name: 'Gemini', start: [5, 21], end: [6, 20] },
        { name: 'Cancer', start: [6, 21], end: [7, 22] },
        { name: 'Leo', start: [7, 23], end: [8, 22] },
        { name: 'Virgo', start: [8, 23], end: [9, 22] },
        { name: 'Libra', start: [9, 23], end: [10, 22] },
        { name: 'Scorpio', start: [10, 23], end: [11, 21] },
        { name: 'Sagittarius', start: [11, 22], end: [12, 21] },
    ];

    for (const sign of signs) {
        if (
            (month === sign.start[0] && day >= sign.start[1]) ||
            (month === sign.end[0] && day <= sign.end[1])
        ) {
            return sign.name;
        }
    }

    return 'Capricorn';
};

const calculateAge = (birthday: Date): number => {
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const monthDelta = today.getMonth() - birthday.getMonth();

    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }

    return age;
};

export function CoreProfileStep({
    globalStepIndex,
    data,
    onUpdate,
    onComplete,
    onBackToEssentials,
}: CoreProfileStepProps) {
    const theme = useOnboardingTheme();
    const [subStep, setSubStep] = useState(0);
    const [birthday, setBirthday] = useState<Date | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [underAgeError, setUnderAgeError] = useState(false);

    const birthdayAge = birthday ? calculateAge(birthday) : 0;
    const isBirthdayValid = Boolean(birthday && birthdayAge >= 18);
    const errorColor = theme.isDark ? Palette.dark.destructive : Palette.light.destructive;

    const stepCopy = useMemo(() => {
        switch (subStep) {
            case 0:
                return {
                    title: "When's your birthday?",
                    subtitle: 'We use this to verify you are 18+ and show your zodiac.',
                };
            case 1:
                return {
                    title: "I am a...",
                    subtitle: 'Select what best describes you.',
                };
            case 2:
                return {
                    title: "I'm interested in...",
                    subtitle: 'Who would you like to meet?',
                };
            default:
                return {
                    title: "What's your dating goal?",
                    subtitle: 'Be honest — it helps us match you better.',
                };
        }
    }, [subStep]);

    const handleBack = () => {
        if (subStep === 0) {
            onBackToEssentials();
            return;
        }

        setSubStep((current) => current - 1);
    };

    const handleBirthdayChange = (_event: unknown, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDatePicker(false);
        }

        if (!selectedDate) {
            return;
        }

        setBirthday(selectedDate);
        const age = calculateAge(selectedDate);
        const zodiac = getZodiacSign(selectedDate.getMonth() + 1, selectedDate.getDate());
        onUpdate({ age, zodiacSign: zodiac });
        setUnderAgeError(age < 18);
    };

    const handleBirthdayContinue = () => {
        if (!isBirthdayValid) {
            setUnderAgeError(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSubStep(1);
    };

    const handleGenderSelect = (gender: string) => {
        onUpdate({ gender });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => setSubStep(2), 220);
    };

    const handleMatchPreferenceSelect = (lookingFor: string) => {
        onUpdate({ lookingFor });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setTimeout(() => setSubStep(3), 220);
    };

    const handleDatingGoalSelect = (relationshipGoal: string) => {
        onUpdate({ relationshipGoal });
    };

    const handleContinue = () => {
        if (subStep === 0) {
            handleBirthdayContinue();
            return;
        }

        if (subStep === 3 && data.relationshipGoal) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onComplete();
        }
    };

    const canContinue =
        subStep === 0
            ? isBirthdayValid
            : subStep === 3
            ? Boolean(data.relationshipGoal)
            : false;

    return (
        <OnboardingScreenShell
            stepIndex={globalStepIndex}
            stepLabel={coreProfileStepLabel(subStep)}
            onBack={handleBack}
            title={stepCopy.title}
            subtitle={stepCopy.subtitle}
            scrollable={subStep > 0}
            centerContent={subStep === 0}
            footer={
                subStep === 0 || subStep === 3 ? (
                    <OnboardingPrimaryButton
                        label="Continue"
                        onPress={handleContinue}
                        disabled={!canContinue}
                    />
                ) : null
            }
        >
            {subStep === 0 ? (
                <View style={styles.birthdaySection}>
                    <Pressable
                        onPress={() => setShowDatePicker(true)}
                        accessibilityRole="button"
                        accessibilityLabel="Select your birthday"
                        style={[
                            styles.dateButton,
                            {
                                backgroundColor: theme.surface,
                                borderColor: underAgeError ? errorColor : theme.border,
                            },
                        ]}
                    >
                        <Text style={[styles.dateButtonText, { color: theme.foreground }]}>
                            {birthday
                                ? birthday.toLocaleDateString('en-US', {
                                      month: 'long',
                                      day: 'numeric',
                                      year: 'numeric',
                                  })
                                : 'Tap to select your birthday'}
                        </Text>
                    </Pressable>

                    {showDatePicker ? (
                        <DateTimePicker
                            value={birthday || new Date(2000, 0, 1)}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleBirthdayChange}
                            maximumDate={
                                new Date(
                                    new Date().getFullYear() - 18,
                                    new Date().getMonth(),
                                    new Date().getDate(),
                                )
                            }
                            minimumDate={new Date(1950, 0, 1)}
                        />
                    ) : null}

                    {birthday && data.zodiacSign ? (
                        <View
                            style={[
                                styles.zodiacReveal,
                                {
                                    backgroundColor: withOnboardingAlpha(
                                        theme.primary,
                                        theme.isDark ? 0.16 : 0.08,
                                    ),
                                },
                            ]}
                        >
                            <Text style={[styles.zodiacText, { color: theme.primary }]}>
                                {`You're ${birthdayAge} and a ${data.zodiacSign}.`}
                            </Text>
                        </View>
                    ) : null}

                    {underAgeError ? (
                        <Text style={[styles.errorText, { color: errorColor }]}>
                            You must be 18+ to use StrathSpace.
                        </Text>
                    ) : null}
                </View>
            ) : null}

            {subStep === 1 ? (
                <View style={styles.choiceList}>
                    {GENDER_IDENTITY_OPTIONS.map((option) => (
                        <OnboardingChoiceRow
                            key={option.value}
                            option={option}
                            selected={data.gender === option.value}
                            onPress={handleGenderSelect}
                        />
                    ))}
                </View>
            ) : null}

            {subStep === 2 ? (
                <View style={styles.choiceList}>
                    {MATCH_PREFERENCE_OPTIONS.map((option) => (
                        <OnboardingChoiceRow
                            key={option.value}
                            option={option}
                            selected={data.lookingFor === option.value}
                            onPress={handleMatchPreferenceSelect}
                        />
                    ))}
                </View>
            ) : null}

            {subStep === 3 ? (
                <View style={styles.choiceList}>
                    {DATING_GOAL_OPTIONS.map((option) => (
                        <OnboardingChoiceRow
                            key={option.value}
                            option={option}
                            selected={data.relationshipGoal === option.value}
                            onPress={handleDatingGoalSelect}
                        />
                    ))}
                </View>
            ) : null}
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    birthdaySection: {
        gap: SPACING.compact,
    },
    dateButton: {
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.base,
        minHeight: 56,
        justifyContent: 'center',
    },
    dateButtonText: {
        ...TYPOGRAPHY.headline,
        textAlign: 'center',
        fontWeight: '500',
    },
    zodiacReveal: {
        borderRadius: RADIUS.lg,
        padding: SPACING.compact,
        alignItems: 'center',
    },
    zodiacText: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
    errorText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        textAlign: 'center',
    },
    choiceList: {
        gap: SPACING.compact,
        paddingBottom: SPACING.base,
        width: '100%',
        alignSelf: 'stretch',
    },
});
