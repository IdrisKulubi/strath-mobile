import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { MOTION, RADIUS, SPACING } from '@/lib/design-tokens';
import { useOnboardingTheme, withOnboardingAlpha, type OnboardingTheme } from '@/lib/onboarding-theme';

import { OnboardingHeader } from './onboarding-header';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { OnboardingScreenBackdrop } from './onboarding-screen-backdrop';

interface TermsAcceptanceProps {
    onAccept: () => void;
    onDecline?: () => void;
}

type AcceptanceKey = 'terms' | 'privacy' | 'community';

interface AgreementItem {
    key: AcceptanceKey;
    title: string;
    description: string;
    viewUrl?: string;
}

const AGREEMENTS: AgreementItem[] = [
    {
        key: 'terms',
        title: 'Terms of Service',
        description: 'Rules for using Strathspace',
        viewUrl: 'https://strathspace.com/terms',
    },
    {
        key: 'privacy',
        title: 'Privacy Policy',
        description: 'How your data is used; AI needs separate opt-in',
        viewUrl: 'https://strathspace.com/privacy',
    },
    {
        key: 'community',
        title: 'Community Guidelines',
        description: 'Respect others and report bad behavior',
    },
];

interface AgreementRowProps {
    item: AgreementItem;
    checked: boolean;
    onToggle: () => void;
    theme: OnboardingTheme;
}

function AgreementRow({ item, checked, onToggle, theme }: AgreementRowProps) {
    const { title, description, viewUrl } = item;

    const handleViewPress = () => {
        if (!viewUrl) {
            return;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        void Linking.openURL(viewUrl);
    };

    return (
        <View
            style={[
                styles.agreementRow,
                {
                    backgroundColor: checked
                        ? withOnboardingAlpha(theme.primary, theme.isDark ? 0.14 : 0.08)
                        : theme.surface,
                    borderColor: checked ? theme.primary : theme.border,
                    borderWidth: checked ? 2 : StyleSheet.hairlineWidth,
                },
            ]}
        >
            <Pressable
                onPress={onToggle}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                accessibilityLabel={`${title}. ${description}`}
                style={styles.agreementMain}
            >
                <View
                    style={[
                        styles.checkbox,
                        {
                            borderColor: checked ? theme.primary : theme.border,
                            backgroundColor: checked ? theme.primary : 'transparent',
                        },
                    ]}
                >
                    {checked ? (
                        <Ionicons name="checkmark" size={14} color={theme.primaryForeground} />
                    ) : null}
                </View>

                <View style={styles.agreementCopy}>
                    <Text style={[styles.agreementTitle, { color: theme.foreground }]}>{title}</Text>
                    <Text style={[styles.agreementDescription, { color: theme.mutedForeground }]}>
                        {description}
                    </Text>
                </View>
            </Pressable>

            {viewUrl ? (
                <Pressable
                    onPress={handleViewPress}
                    accessibilityRole="button"
                    accessibilityLabel={`View ${title}`}
                    style={[
                        styles.viewButton,
                        { backgroundColor: withOnboardingAlpha(theme.primary, theme.isDark ? 0.2 : 0.1) },
                    ]}
                >
                    <Text style={[styles.viewButtonText, { color: theme.primary }]}>View</Text>
                </Pressable>
            ) : null}
        </View>
    );
}

export function TermsAcceptance({ onAccept }: TermsAcceptanceProps) {
    const theme = useOnboardingTheme();
    const reducedMotion = useReducedMotion();
    const insets = useSafeAreaInsets();

    const [accepted, setAccepted] = useState<Record<AcceptanceKey, boolean>>({
        terms: false,
        privacy: false,
        community: false,
    });

    const allAccepted = accepted.terms && accepted.privacy && accepted.community;

    const containerStyle = useMemo(
        () => ({
            paddingTop: insets.top + SPACING.compact,
            paddingBottom: Math.max(insets.bottom, SPACING.base),
        }),
        [insets.bottom, insets.top],
    );

    const toggleAcceptance = (key: AcceptanceKey) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAccepted((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const handleContinue = () => {
        if (!allAccepted) {
            return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onAccept();
    };

    const topEntering = reducedMotion ? undefined : FadeInDown.delay(60).duration(MOTION.short);
    const cardsEntering = reducedMotion ? undefined : FadeInUp.delay(100).duration(MOTION.short);
    const footerEntering = reducedMotion ? undefined : FadeInUp.delay(160).duration(MOTION.short);

    return (
        <View style={[styles.container, containerStyle]}>
            <OnboardingScreenBackdrop />

            <View style={styles.body}>
                <Animated.View entering={topEntering} style={styles.topSection}>
                    <OnboardingProgressBar stepIndex={1} />
                    <OnboardingHeader stepIndex={1} />
                </Animated.View>

                <Animated.View entering={cardsEntering} style={styles.main}>
                    <View style={styles.header}>
                        <View style={[styles.iconContainer, { backgroundColor: theme.primarySoft }]}>
                            <Ionicons name="shield-checkmark" size={28} color={theme.primary} />
                        </View>
                        <Text style={[styles.title, { color: theme.foreground }]}>
                            Before We Start
                        </Text>
                        <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                            Accept these to keep Strathspace safe for everyone.
                        </Text>
                    </View>

                    <View style={styles.agreements}>
                        {AGREEMENTS.map((item) => (
                            <AgreementRow
                                key={item.key}
                                item={item}
                                checked={accepted[item.key]}
                                onToggle={() => toggleAcceptance(item.key)}
                                theme={theme}
                            />
                        ))}
                    </View>

                    <Text style={[styles.trustLine, { color: theme.mutedForeground }]}>
                        Zero tolerance for abuse · Report freely · Block anytime · 24h review
                    </Text>
                </Animated.View>

                <Animated.View entering={footerEntering} style={styles.footer}>
                    <OnboardingPrimaryButton
                        label={allAccepted ? "I Agree, Let's Go" : 'Accept all to continue'}
                        onPress={handleContinue}
                        disabled={!allAccepted}
                        accessibilityLabel={
                            allAccepted ? "I Agree, Let's Go" : 'Accept all agreements to continue'
                        }
                        icon="checkmark"
                    />
                    <Text style={[styles.disclaimer, { color: theme.mutedForeground }]}>
                        By continuing, you confirm you are at least 18 and a university student.
                    </Text>
                </Animated.View>
            </View>
        </View>
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
        gap: SPACING.base,
        flexShrink: 1,
    },
    header: {
        alignItems: 'center',
        gap: SPACING.tight,
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: RADIUS.full,
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        lineHeight: 30,
        fontWeight: '700',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        paddingHorizontal: SPACING.tight,
    },
    agreements: {
        gap: SPACING.tight,
        width: '100%',
    },
    agreementRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: RADIUS.md,
        paddingVertical: SPACING.compact,
        paddingLeft: SPACING.compact,
        paddingRight: SPACING.tight,
        gap: SPACING.tight,
    },
    agreementMain: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
        minHeight: 44,
        minWidth: 0,
    },
    agreementCopy: {
        flex: 1,
        minWidth: 0,
        paddingRight: SPACING.micro,
    },
    agreementTitle: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '600',
    },
    agreementDescription: {
        fontSize: 12,
        lineHeight: 16,
        marginTop: 2,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: RADIUS.full,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    viewButton: {
        height: 36,
        minWidth: 52,
        paddingHorizontal: SPACING.compact,
        borderRadius: RADIUS.sm,
        justifyContent: 'center',
        alignItems: 'center',
        flexShrink: 0,
    },
    viewButtonText: {
        fontSize: 12,
        fontWeight: '600',
    },
    trustLine: {
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'center',
        paddingHorizontal: SPACING.micro,
    },
    footer: {
        width: '100%',
        gap: SPACING.compact,
        paddingTop: SPACING.tight,
    },
    disclaimer: {
        fontSize: 12,
        lineHeight: 16,
        textAlign: 'center',
    },
});
