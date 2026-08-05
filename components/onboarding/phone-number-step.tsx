import React, { useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    TextInput,
    Pressable,
    KeyboardAvoidingView,
    Keyboard,
    Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { essentialsStepLabel } from '@/constants/onboarding';
import { MOTION, Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';
import {
    derivePhoneStateFromE164,
    formatNationalNumberInput,
    getCallingCodeDisplay,
    parseNationalPhoneNumber,
    type PhoneCountrySelection,
} from '@/lib/phone-country';

import { OnboardingHeader } from './onboarding-header';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { OnboardingScreenBackdrop } from './onboarding-screen-backdrop';
import { PhoneCountryPickerModal } from './phone-country-picker-modal';
import { countryCodeToEmoji } from '@/lib/country-flag';

const PHONE_ERROR_MESSAGE = 'Enter a valid phone number for the selected country.';

interface PhoneNumberStepProps {
    initialPhoneNumber?: string;
    hasPrefilledName: boolean;
    globalStepIndex: number;
    onBack?: () => void;
    onContinue: (phoneNumber: string) => void;
}

export function PhoneNumberStep({
    initialPhoneNumber = '',
    hasPrefilledName,
    globalStepIndex,
    onBack,
    onContinue,
}: PhoneNumberStepProps) {
    const theme = useOnboardingTheme();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();

    const initialState = useMemo(
        () => derivePhoneStateFromE164(initialPhoneNumber),
        [initialPhoneNumber],
    );

    const [country, setCountry] = useState<PhoneCountrySelection>(initialState.country);
    const [nationalNumber, setNationalNumber] = useState(initialState.nationalNumber);
    const [phoneError, setPhoneError] = useState('');
    const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);

    const essentialsLabel = essentialsStepLabel(1, hasPrefilledName);
    const errorColor = theme.isDark ? Palette.dark.destructive : Palette.light.destructive;
    const isValid = useMemo(
        () => !!parseNationalPhoneNumber(nationalNumber, country),
        [country, nationalNumber],
    );

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

    const handleNationalChange = (text: string) => {
        const digits = text.replace(/\D/g, '');
        const formatted = formatNationalNumberInput(digits, country.countryCode);
        setNationalNumber(formatted);

        if (phoneError) {
            setPhoneError('');
        }
    };

    const handleCountrySelect = (nextCountry: PhoneCountrySelection) => {
        setCountry(nextCountry);
        setIsCountryPickerVisible(false);

        const digits = nationalNumber.replace(/\D/g, '');
        if (digits) {
            setNationalNumber(formatNationalNumberInput(digits, nextCountry.countryCode));
        }

        if (phoneError) {
            setPhoneError('');
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleContinue = () => {
        Keyboard.dismiss();
        const parsed = parseNationalPhoneNumber(nationalNumber, country);

        if (parsed) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onContinue(parsed.number);
            return;
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setPhoneError(PHONE_ERROR_MESSAGE);
    };

    return (
        <KeyboardAvoidingView
            style={[styles.container, containerStyle]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <OnboardingScreenBackdrop />

            <Pressable style={styles.body} onPress={Keyboard.dismiss} accessible={false}>
                <Animated.View entering={topEntering} style={styles.topSection}>
                    <OnboardingProgressBar stepIndex={globalStepIndex} />
                    <OnboardingHeader
                        stepIndex={globalStepIndex}
                        stepLabel={essentialsLabel}
                        onBack={onBack}
                    />
                </Animated.View>

                <Animated.View entering={mainEntering} style={styles.main}>
                    <Text style={[styles.title, { color: theme.foreground }]}>
                        {"What's your number?"}
                    </Text>

                    <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                        We use it to verify your account and help keep matching safe.
                    </Text>

                    <View
                        style={[
                            styles.inputRow,
                            {
                                backgroundColor: theme.surface,
                                borderColor: phoneError ? errorColor : theme.border,
                            },
                        ]}
                    >
                        <Pressable
                            onPress={() => setIsCountryPickerVisible(true)}
                            accessibilityRole="button"
                            accessibilityLabel={`Country code ${getCallingCodeDisplay(country.callingCode)}`}
                            style={({ pressed }) => [
                                styles.countryTrigger,
                                {
                                    borderRightColor: theme.border,
                                    opacity: pressed ? 0.88 : 1,
                                },
                            ]}
                        >
                            <View style={styles.countryTriggerContent}>
                                <Text style={styles.flagEmoji}>
                                    {countryCodeToEmoji(country.countryCode)}
                                </Text>
                                <Text style={[styles.callingCode, { color: theme.foreground }]}>
                                    {getCallingCodeDisplay(country.callingCode)}
                                </Text>
                                <Ionicons
                                    name="chevron-down"
                                    size={14}
                                    color={theme.mutedForeground}
                                />
                            </View>
                        </Pressable>

                        <PhoneCountryPickerModal
                            visible={isCountryPickerVisible}
                            selectedCountryCode={country.countryCode}
                            onClose={() => setIsCountryPickerVisible(false)}
                            onSelect={handleCountrySelect}
                        />

                        <TextInput
                            style={[styles.phoneInput, { color: theme.foreground }]}
                            value={nationalNumber}
                            onChangeText={handleNationalChange}
                            keyboardType="phone-pad"
                            textContentType="telephoneNumber"
                            autoComplete="tel"
                            placeholder="712 345 678"
                            placeholderTextColor={theme.mutedForeground}
                            accessibilityLabel="Phone number"
                            autoFocus
                        />
                    </View>

                    <View
                        style={[
                            styles.reassuranceRow,
                            {
                                backgroundColor: withOnboardingAlpha(
                                    theme.primary,
                                    theme.isDark ? 0.12 : 0.08,
                                ),
                            },
                        ]}
                    >
                        <Ionicons name="lock-closed" size={14} color={theme.primary} />
                        <Text style={[styles.reassuranceText, { color: theme.mutedForeground }]}>
                            Your number stays private. Used for verification and safety.
                        </Text>
                    </View>

                    {!!phoneError && (
                        <Text
                            style={[styles.errorText, { color: errorColor }]}
                            accessibilityRole="alert"
                            accessibilityLiveRegion="polite"
                        >
                            {phoneError}
                        </Text>
                    )}
                </Animated.View>

                <Animated.View entering={footerEntering} style={styles.footer}>
                    <OnboardingPrimaryButton
                        label="Continue"
                        onPress={handleContinue}
                        disabled={!isValid}
                        accessibilityLabel="Continue with phone number"
                    />
                </Animated.View>
            </Pressable>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: SPACING.screenX,
    },
    body: {
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
        width: '100%',
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
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        minHeight: 56,
        overflow: 'hidden',
    },
    countryTrigger: {
        minHeight: 56,
        justifyContent: 'center',
        borderRightWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.compact,
    },
    countryTriggerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
    },
    flagEmoji: {
        fontSize: 20,
        width: 24,
        textAlign: 'center',
    },
    callingCode: {
        fontSize: 16,
        fontWeight: '600',
    },
    phoneInput: {
        flex: 1,
        minWidth: 0,
        fontSize: 17,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.compact,
    },
    reassuranceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
        borderRadius: RADIUS.md,
    },
    reassuranceText: {
        ...TYPOGRAPHY.caption,
        flex: 1,
    },
    errorText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
    },
    footer: {
        width: '100%',
    },
});
