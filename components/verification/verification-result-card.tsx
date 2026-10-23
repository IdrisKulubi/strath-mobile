import React, { useMemo } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { CheckCircle } from 'phosphor-react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { FaceVerificationSession } from '@/hooks/use-face-verification';
import type { VerificationRetryGuidance } from '@/lib/verification/retry-guidance';
import { useVerificationThemedStyles } from '@/lib/verification/use-verification-themed-styles';
import { SPACING } from '@/lib/design-tokens';

import { VerificationAssistanceBlock } from './verification-assistance-block';
import { VerificationStatsBlock } from './verification-stats-block';

type ResultAction = {
    label: string;
    onPress: () => void;
    variant: 'primary' | 'secondary' | 'tertiary';
    accessibilityLabel: string;
};

interface VerificationSuccessCardProps {
    opacity: Animated.Value;
    scale: Animated.Value;
    session: FaceVerificationSession | null | undefined;
    profileRetryCount: number;
    verifiedAtLabel: string | null;
    isBusy: boolean;
    onContinue: () => void;
}

export function VerificationSuccessCard({
    opacity,
    scale,
    session,
    profileRetryCount,
    verifiedAtLabel,
    isBusy,
    onContinue,
}: VerificationSuccessCardProps) {
    const theme = useVerificationThemedStyles();

    return (
        <Animated.View
            style={[
                theme.resultCardBase,
                theme.resultCardSuccess,
                styles.successCard,
                { opacity, transform: [{ scale }] },
            ]}
        >
            <View style={styles.successHeader}>
                <View style={[styles.iconWrap, theme.resultIconWrapSuccess]}>
                    <CheckCircle size={34} color={theme.colors.success} weight="fill" />
                </View>
                <View style={styles.successCopy}>
                    <Text variant="h3" style={{ color: theme.colors.foreground }}>
                        You&apos;re verified
                    </Text>
                    <Text variant="muted" style={{ marginTop: SPACING.micro }}>
                        Your profile is cleared and ready for the app.
                    </Text>
                </View>
            </View>

            <VerificationStatsBlock
                session={session}
                profileRetryCount={profileRetryCount}
                verifiedAtLabel={verifiedAtLabel}
                variant="success"
            />

            <Button
                onPress={onContinue}
                disabled={isBusy}
                style={styles.fullWidth}
                accessibilityLabel="Continue to app"
            >
                <Text>{isBusy ? 'Please wait…' : 'Continue to app'}</Text>
            </Button>
        </Animated.View>
    );
}

interface VerificationRetryCardProps {
    opacity: Animated.Value;
    scale: Animated.Value;
    guidance: VerificationRetryGuidance | null;
    photoFailureCauseLine: string | null;
    session: FaceVerificationSession | null | undefined;
    profileRetryCount: number;
    showPhoto: boolean;
    showSelfie: boolean;
    showAssistance?: boolean;
    onEditProfilePhotos: () => void;
    onRetakeSelfie: () => void;
    onBackToForm: () => void;
}

export function VerificationRetryCard({
    opacity,
    scale,
    guidance,
    photoFailureCauseLine,
    session,
    profileRetryCount,
    showPhoto,
    showSelfie,
    showAssistance = false,
    onEditProfilePhotos,
    onRetakeSelfie,
    onBackToForm,
}: VerificationRetryCardProps) {
    const theme = useVerificationThemedStyles();

    const actions = useMemo(() => {
        const list: ResultAction[] = [];
        if (showPhoto) {
            list.push({
                label: 'Update profile photos',
                onPress: onEditProfilePhotos,
                variant: 'primary',
                accessibilityLabel: 'Update profile photos',
            });
        }
        if (showSelfie) {
            list.push({
                label: 'Retake selfie',
                onPress: onRetakeSelfie,
                variant: showPhoto ? 'secondary' : 'primary',
                accessibilityLabel: 'Retake verification selfie',
            });
        }
        list.push({
            label: 'Back to verification',
            onPress: onBackToForm,
            variant: list.length > 0 ? 'tertiary' : 'primary',
            accessibilityLabel: 'Back to verification form',
        });
        return list;
    }, [onBackToForm, onEditProfilePhotos, onRetakeSelfie, showPhoto, showSelfie]);

    return (
        <Animated.View
            style={[
                theme.resultPanelFlat,
                { opacity, transform: [{ scale }] },
            ]}
        >
            <Text variant="h3" style={[theme.resultTitle, { textAlign: 'left' }]}>
                {guidance?.title ?? 'Verification needs another try'}
            </Text>
            <Text variant="muted" style={[theme.resultBody, { textAlign: 'left', maxWidth: undefined }]}>
                {guidance?.shortBody ?? 'Something was not clear enough in the last attempt.'}
            </Text>
            {guidance?.body ? (
                <Text variant="caption" style={[theme.resultBodyMuted, { textAlign: 'left', maxWidth: undefined }]}>
                    {guidance.body}
                </Text>
            ) : null}

            {photoFailureCauseLine ? (
                <View style={theme.resultCauseBanner}>
                    <Text style={theme.resultCauseBannerText}>{photoFailureCauseLine}</Text>
                </View>
            ) : null}

            <VerificationStatsBlock
                session={session}
                profileRetryCount={profileRetryCount}
                variant="retry"
            />

            {(guidance?.tips.slice(0, 2) ?? []).length > 0 ? (
                <View style={styles.tips}>
                    {(guidance?.tips.slice(0, 2) ?? []).map((tip) => (
                        <View key={tip} style={styles.tipRow}>
                            <View style={theme.retryTipDot} />
                            <Text variant="caption" style={{ color: theme.colors.mutedForeground, flex: 1 }}>
                                {tip}
                            </Text>
                        </View>
                    ))}
                </View>
            ) : null}

            {showAssistance && session?.id ? (
                <VerificationAssistanceBlock sessionId={session.id} />
            ) : null}

            <View style={styles.actions}>
                {actions.map((action) => {
                    if (action.variant === 'primary') {
                        return (
                            <Button
                                key={action.label}
                                onPress={action.onPress}
                                style={styles.fullWidth}
                                accessibilityLabel={action.accessibilityLabel}
                            >
                                <Text>{action.label}</Text>
                            </Button>
                        );
                    }
                    if (action.variant === 'secondary') {
                        return (
                            <Button
                                key={action.label}
                                variant="secondary"
                                onPress={action.onPress}
                                style={styles.fullWidth}
                                accessibilityLabel={action.accessibilityLabel}
                            >
                                <Text>{action.label}</Text>
                            </Button>
                        );
                    }
                    return (
                        <Button
                            key={action.label}
                            variant="outline"
                            onPress={action.onPress}
                            style={styles.fullWidth}
                            accessibilityLabel={action.accessibilityLabel}
                        >
                            <Text>{action.label}</Text>
                        </Button>
                    );
                })}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    successCard: {
        width: '100%',
        gap: SPACING.comfortable,
    },
    successHeader: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    successCopy: {
        flex: 1,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    retryIconWrap: {
        width: 88,
        height: 88,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    tips: {
        width: '100%',
        gap: SPACING.tight,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.tight,
    },
    actions: {
        width: '100%',
        gap: SPACING.compact,
    },
    fullWidth: {
        width: '100%',
        minHeight: 48,
    },
});
