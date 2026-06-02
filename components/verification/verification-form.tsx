import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { Camera, Hourglass, PencilSimple, ShieldCheck } from 'phosphor-react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import type { FaceVerificationSession } from '@/hooks/use-face-verification';
import { getFriendlyStatusLabel, getStatusDetailCopy } from '@/lib/verification/verification-copy';
import { useVerificationThemedStyles } from '@/lib/verification/use-verification-themed-styles';
import { SPACING, RADIUS } from '@/lib/design-tokens';

import { VerificationStatsBlock } from './verification-stats-block';
import { VerificationStepCard } from './verification-step-card';

interface VerificationFormProps {
    profilePhotoUrls: string[];
    profileSummary: string;
    selfieUri: string | null;
    status: string;
    isProcessing: boolean;
    latestSession: FaceVerificationSession | null | undefined;
    profileRetryCount: number;
    pollTimedOut?: boolean;
    queuedBackground?: boolean;
    onCaptureSelfie: () => void;
    onEditProfilePhotos: () => void;
}

export function VerificationForm({
    profilePhotoUrls,
    profileSummary,
    selfieUri,
    status,
    isProcessing,
    latestSession,
    profileRetryCount,
    pollTimedOut = false,
    queuedBackground = false,
    onCaptureSelfie,
    onEditProfilePhotos,
}: VerificationFormProps) {
    const theme = useVerificationThemedStyles();
    const needsMorePhotos = profilePhotoUrls.length < 2;

    return (
        <>
            <View style={styles.hero}>
               
                <Text variant="h3" style={{ color: theme.colors.foreground }}>
                    Verify your face
                </Text>
                <Text variant="p" style={{ color: theme.colors.mutedForeground, marginTop: 0 }}>
                    One quick selfie so other users know your profile is real.
                </Text>
            </View>

            <VerificationStepCard
                title="Profile photos"
                meta={profileSummary}
                headerAction={{
                    label: 'Edit',
                    onPress: onEditProfilePhotos,
                    accessibilityLabel: 'Edit profile photos',
                }}
                helperText={
                    needsMorePhotos
                        ? 'Add at least 2 clear profile photos before you submit.'
                        : undefined
                }
            >
                <View style={styles.photoRow}>
                    {profilePhotoUrls.slice(0, 4).map((photo, index) => (
                        <Image
                            key={`${photo}-${index}`}
                            source={{ uri: photo }}
                            style={styles.profileThumb}
                            accessibilityIgnoresInvertColors
                        />
                    ))}
                </View>
                <Button
                    variant={needsMorePhotos ? 'secondary' : 'outline'}
                    onPress={onEditProfilePhotos}
                    style={styles.editPhotosButton}
                    accessibilityLabel={
                        needsMorePhotos ? 'Add profile photos' : 'Edit profile photos'
                    }
                >
                    <PencilSimple size={18} color={theme.colors.primary} weight="bold" />
                    <Text>{needsMorePhotos ? 'Add profile photos' : 'Edit profile photos'}</Text>
                </Button>
            </VerificationStepCard>

            <VerificationStepCard title="Selfie" meta="Good light, face centered">
                {selfieUri ? (
                    <Image
                        source={{ uri: selfieUri }}
                        style={styles.selfiePreview}
                        accessibilityIgnoresInvertColors
                    />
                ) : (
                    <Pressable
                        style={theme.selfiePlaceholder}
                        onPress={onCaptureSelfie}
                        accessibilityRole="button"
                        accessibilityLabel="Take verification selfie"
                    >
                        <Camera size={36} color={theme.colors.primary} weight="duotone" />
                        <Text variant="caption" style={{ color: theme.colors.mutedForeground, fontWeight: '600' }}>
                            Take selfie
                        </Text>
                    </Pressable>
                )}
                {selfieUri ? (
                    <Button
                        variant="outline"
                        size="sm"
                        onPress={onCaptureSelfie}
                        accessibilityLabel="Retake verification selfie"
                    >
                        <Text>Retake selfie</Text>
                    </Button>
                ) : null}
            </VerificationStepCard>

            <View style={theme.statusCard}>
                <View style={styles.statusHeader}>
                    {isProcessing ? (
                        <Hourglass size={20} color={theme.colors.warning} weight="fill" />
                    ) : (
                        <ShieldCheck size={20} color={theme.colors.primary} weight="fill" />
                    )}
                    <Text variant="large" style={{ color: theme.colors.foreground, flex: 1 }}>
                        {getFriendlyStatusLabel(status)}
                    </Text>
                </View>
                <Text variant="muted">
                    {getStatusDetailCopy(status, isProcessing, { pollTimedOut, queuedBackground })}
                </Text>
                <VerificationStatsBlock
                    session={latestSession}
                    profileRetryCount={profileRetryCount}
                    variant="inline"
                />
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    hero: {
        gap: SPACING.compact,
    },
    photoRow: {
        flexDirection: 'row',
        gap: SPACING.tight,
    },
    profileThumb: {
        width: 64,
        height: 82,
        borderRadius: RADIUS.md,
    },
    selfiePreview: {
        width: '100%',
        height: 280,
        borderRadius: RADIUS.lg,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
    },
    editPhotosButton: {
        width: '100%',
        minHeight: 48,
    },
});
