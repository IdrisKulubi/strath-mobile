import React, { useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import {
    derivePhoneStateFromE164,
    formatNationalNumberInput,
    getCallingCodeDisplay,
    parseNationalPhoneNumber,
    type PhoneCountrySelection,
} from '@/lib/phone-country';
import { countryCodeToEmoji } from '@/lib/country-flag';

import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';
import { PhoneCountryPickerModal } from './phone-country-picker-modal';
import { RisingInlineFeedback } from './rising-inline-feedback';

interface PhoneNumberStepProps {
    initialPhoneNumber?: string;
    hasPrefilledName: boolean;
    globalStepIndex: number;
    onBack?: () => void;
    onContinue: (phoneNumber: string) => void;
}

export function PhoneNumberStep({ initialPhoneNumber = '', globalStepIndex, onBack, onContinue }: PhoneNumberStepProps) {
    const { colors } = useTheme();
    const initialState = useMemo(() => derivePhoneStateFromE164(initialPhoneNumber), [initialPhoneNumber]);
    const [country, setCountry] = useState<PhoneCountrySelection>(initialState.country);
    const [nationalNumber, setNationalNumber] = useState(initialState.nationalNumber);
    const [phoneError, setPhoneError] = useState('');
    const [isCountryPickerVisible, setIsCountryPickerVisible] = useState(false);
    const validNumber = useMemo(() => parseNationalPhoneNumber(nationalNumber, country), [nationalNumber, country]);

    const continueWithPhone = () => {
        Keyboard.dismiss();
        const parsed = parseNationalPhoneNumber(nationalNumber, country);
        if (!parsed) {
            setPhoneError('Enter a valid phone number for the selected country.');
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }
        onContinue(parsed.number);
    };

    return (
        <OnboardingScreenShell
            presentation="rising"
            sheetEntrance={false}
            stepIndex={globalStepIndex}
            beatKey="phone"
            progressLabel="About you"
            progressIndex={0}
            progressCount={4}
            onBack={onBack}
            title="What’s your number?"
            subtitle="We use it for account verification and safety. It stays private."
            footer={<OnboardingPrimaryButton appearance="rising" label="Continue" disabled={!validNumber} onPress={continueWithPhone} />}
        >
            <View style={styles.content}>
                <View style={[styles.inputRow, { backgroundColor: colors.control, borderColor: phoneError ? colors.destructive : colors.controlBorder }]}>
                    <Pressable accessibilityRole="button" accessibilityLabel={`Country code ${getCallingCodeDisplay(country.callingCode)}`} onPress={() => setIsCountryPickerVisible(true)} style={[styles.country, { borderRightColor: colors.controlBorder }]}>
                        <Text style={styles.flag}>{countryCodeToEmoji(country.countryCode)}</Text>
                        <Text style={[styles.countryCode, { color: colors.foreground }]}>{getCallingCodeDisplay(country.callingCode)}</Text>
                        <Ionicons name="chevron-down" size={14} color={colors.mutedForeground} />
                    </Pressable>
                    <TextInput
                        value={nationalNumber}
                        onChangeText={(value) => { setNationalNumber(formatNationalNumberInput(value.replace(/\D/g, ''), country.countryCode)); setPhoneError(''); }}
                        keyboardType="phone-pad"
                        textContentType="telephoneNumber"
                        autoComplete="tel"
                        placeholder="712 345 678"
                        placeholderTextColor={colors.mutedForeground}
                        accessibilityLabel="Phone number"
                        style={[styles.phoneInput, { color: colors.foreground }]}
                    />
                </View>
                <PhoneCountryPickerModal
                    visible={isCountryPickerVisible}
                    selectedCountryCode={country.countryCode}
                    onClose={() => setIsCountryPickerVisible(false)}
                    onSelect={(nextCountry) => {
                        setCountry(nextCountry);
                        setNationalNumber(formatNationalNumberInput(nationalNumber.replace(/\D/g, ''), nextCountry.countryCode));
                        setIsCountryPickerVisible(false);
                        setPhoneError('');
                    }}
                />
                {phoneError ? <RisingInlineFeedback tone="error" message={phoneError} /> : null}
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>Your number is not shown on your profile.</Text>
            </View>
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    content: { gap: SPACING.compact },
    inputRow: { minHeight: 56, borderRadius: RADIUS.row, borderWidth: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
    country: { minHeight: 56, paddingHorizontal: SPACING.compact, borderRightWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: SPACING.tight },
    flag: { fontSize: 20 },
    countryCode: { ...TYPOGRAPHY.body, fontWeight: '600' },
    phoneInput: { flex: 1, minHeight: HEIGHTS.input, paddingHorizontal: SPACING.compact, ...TYPOGRAPHY.body },
    hint: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
