import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';
import { RisingInlineFeedback } from './rising-inline-feedback';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme } from '@/lib/onboarding-theme';

interface LaunchCelebrationProps {
    userName: string;
    mainPhoto?: string;
    onComplete: () => void;
    onBack?: () => void;
    onRetry?: () => void;
    isLoading?: boolean;
    hasError?: boolean;
    errorMessage?: string;
}

export function LaunchCelebration({
    userName,
    mainPhoto,
    onComplete,
    onBack,
    onRetry,
    isLoading = false,
    hasError = false,
    errorMessage,
}: LaunchCelebrationProps) {
    const theme = useOnboardingTheme();
    return (
        <OnboardingScreenShell
            presentation="rising"
            stepIndex={7}
            beatKey="profile-save"
            progressLabel="Your profile"
            progressIndex={2}
            progressCount={3}
            onBack={isLoading ? undefined : onBack}
            title={`Ready to save, ${userName || 'you'}?`}
            subtitle="We'll save your photos and answer, then guide you through verification."
            footer={
                <OnboardingPrimaryButton
                    appearance="rising"
                    label={isLoading ? 'Saving your profile…' : hasError ? 'Retry save' : 'Save and continue'}
                    onPress={hasError ? onRetry ?? onComplete : onComplete}
                    disabled={isLoading}
                />
            }
        >
            <View style={styles.preview}>
                {mainPhoto ? <Image source={{ uri: mainPhoto }} style={styles.photo} accessibilityLabel="Your main profile photo" /> : null}
                <Text style={[styles.name, { color: theme.foreground }]}>{userName}</Text>
            </View>
            {isLoading ? <RisingInlineFeedback message="Uploading and saving your profile. Keep this screen open." /> : null}
            {hasError ? <RisingInlineFeedback tone="error" message={errorMessage || 'Your profile was not saved. Try again.'} /> : null}
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    preview: { alignItems: 'center', gap: SPACING.compact },
    photo: { width: 128, height: 160, borderRadius: RADIUS.row },
    name: { ...TYPOGRAPHY.title },
});
