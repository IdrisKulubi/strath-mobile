import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { RisingTextField } from './rising-text-field';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';
import { PhoneNumberStep } from './phone-number-step';
import { SPACING } from '@/lib/design-tokens';

interface TheEssentialsProps {
    data: { firstName: string; lastName: string; phoneNumber: string };
    onUpdate: (data: Partial<TheEssentialsProps['data']>) => void;
    onNext: () => void;
    onBack?: () => void;
}

export function TheEssentials({ data, onUpdate, onNext, onBack }: TheEssentialsProps) {
    const hasPrefilledName = data.firstName.trim().length >= 2 && data.lastName.trim().length >= 2;
    const [startedWithName] = useState(hasPrefilledName);
    const [step, setStep] = useState(hasPrefilledName ? 1 : 0);
    const [firstName, setFirstName] = useState(data.firstName);
    const [lastName, setLastName] = useState(data.lastName);
    const validName = firstName.trim().length >= 2 && lastName.trim().length >= 2;

    useEffect(() => {
        let cancelled = false;
        queueMicrotask(() => {
            if (cancelled) return;
            if (data.firstName && !firstName) setFirstName(data.firstName);
            if (data.lastName && !lastName) setLastName(data.lastName);
            if (hasPrefilledName && step === 0 && !firstName && !lastName) setStep(1);
        });
        return () => { cancelled = true; };
    }, [data.firstName, data.lastName, firstName, lastName, hasPrefilledName, step]);

    if (step === 1) {
        return (
            <PhoneNumberStep
                initialPhoneNumber={data.phoneNumber}
                hasPrefilledName={hasPrefilledName}
                globalStepIndex={2}
                onBack={startedWithName ? onBack : () => setStep(0)}
                onContinue={(phoneNumber) => { onUpdate({ phoneNumber }); onNext(); }}
            />
        );
    }

    return (
        <OnboardingScreenShell
            presentation="rising"
            sheetEntrance={false}
            stepIndex={2}
            beatKey="name"
            progressLabel="About you"
            progressIndex={0}
            progressCount={4}
            onBack={onBack}
            title="What should we call you?"
            subtitle="This is the name people will see on your profile."
            footer={<OnboardingPrimaryButton appearance="rising" label="Continue" disabled={!validName} onPress={() => {
                if (!validName) return;
                onUpdate({ firstName: firstName.trim(), lastName: lastName.trim() });
                setStep(1);
            }} />}
        >
            <View style={styles.fields}>
                <RisingTextField label="First name" value={firstName} onChangeText={setFirstName} autoComplete="given-name" autoCapitalize="words" />
                <RisingTextField label="Last name" value={lastName} onChangeText={setLastName} autoComplete="family-name" autoCapitalize="words" />
            </View>
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({ fields: { gap: SPACING.compact } });
