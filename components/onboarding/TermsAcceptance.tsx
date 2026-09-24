import React, { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { HEIGHTS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

import { OnboardingChoiceRow } from './onboarding-choice-row';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingScreenShell } from './onboarding-screen-shell';
import { RisingInlineFeedback } from './rising-inline-feedback';

interface TermsAcceptanceProps {
    onAccept: () => void;
    onBack?: () => void;
}

type AcceptanceKey = 'terms' | 'privacy' | 'community';

const AGREEMENTS: { key: AcceptanceKey; label: string; description: string; url?: string }[] = [
    { key: 'terms', label: 'Terms of Service', description: 'Rules for using StrathSpace', url: 'https://strathspace.com/terms' },
    { key: 'privacy', label: 'Privacy Policy', description: 'How your data is used', url: 'https://strathspace.com/privacy' },
    { key: 'community', label: 'Community Guidelines', description: 'Respect others and report bad behavior' },
];

export function TermsAcceptance({ onAccept, onBack }: TermsAcceptanceProps) {
    const { colors } = useTheme();
    const submitting = useRef(false);
    const [accepted, setAccepted] = useState<Record<AcceptanceKey, boolean>>({ terms: false, privacy: false, community: false });
    const [linkError, setLinkError] = useState<string | null>(null);
    const allAccepted = accepted.terms && accepted.privacy && accepted.community;

    const accept = () => {
        if (!allAccepted || submitting.current) return;
        submitting.current = true;
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAccept();
    };

    const openLegal = async (url: string) => {
        try {
            setLinkError(null);
            await Linking.openURL(url);
        } catch {
            setLinkError('Could not open the document. Check your connection and try again.');
        }
    };

    return (
        <OnboardingScreenShell
            presentation="rising"
            stepIndex={1}
            progressLabel="Getting started"
            progressIndex={0}
            progressCount={4}
            sheetEntrance={false}
            title="Before we begin"
            subtitle="Please read and accept each agreement to continue."
            onBack={onBack}
            footer={
                <View style={styles.footer}>
                    <OnboardingPrimaryButton appearance="rising" label="Agree and continue" disabled={!allAccepted} onPress={accept} />
                    <Text style={[styles.disclaimer, { color: colors.mutedForeground }]}>
                        By continuing, you confirm you are at least 18 and a university student.
                    </Text>
                </View>
            }
        >
            <View style={styles.agreements}>
                {AGREEMENTS.map((item) => (
                    <View key={item.key} style={styles.agreement}>
                        <OnboardingChoiceRow
                            appearance="rising"
                            selectionMode="multiple"
                            option={{ value: item.key, label: item.label, description: item.description }}
                            selected={accepted[item.key]}
                            onPress={() => setAccepted((previous) => ({ ...previous, [item.key]: !previous[item.key] }))}
                        />
                        {item.url ? (
                            <Pressable accessibilityRole="link" accessibilityLabel={`Read ${item.label}`} onPress={() => { void openLegal(item.url!); }} style={styles.readLink}>
                                <Text style={[styles.linkText, { color: colors.primaryText }]}>Read {item.label}</Text>
                            </Pressable>
                        ) : null}
                    </View>
                ))}
                {linkError ? <RisingInlineFeedback tone="error" message={linkError} /> : null}
            </View>
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    agreements: { gap: SPACING.compact },
    agreement: { gap: SPACING.micro },
    readLink: { minHeight: HEIGHTS.touchMin, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: SPACING.compact },
    linkText: { ...TYPOGRAPHY.caption, fontWeight: '600' },
    footer: { gap: SPACING.compact },
    disclaimer: { ...TYPOGRAPHY.caption, textAlign: 'center' },
});
