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
    beat: 0 | 1;
    cameraError: string | null;
    onBackToPhotos: () => void;
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
    beat,
    cameraError,
    onBackToPhotos,
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
                    {beat === 0 ? 'A quick check to build trust' : 'Take your verification selfie'}
                </Text>
                <Text variant="p" style={{ color: theme.colors.mutedForeground, marginTop: 0 }}>
                    {beat === 0 ? 'We compare one selfie with your profile photos. We ask for camera access only when you choose to take it.' : 'Face the camera in good light. You can retake the photo before submitting.'}
                </Text>
            </View>

            {beat === 0 ? (
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
                            accessibilityLabel={`Profile photo ${index + 1}`}
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
            ) : null}

            {beat === 1 ? (
            <>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to profile photos" onPress={onBackToPhotos}>
                <Text style={{ color: theme.colors.primary }}>Back to photos</Text>
            </Pressable>
            <VerificationStepCard title="Selfie" meta="Good light, face centered">
                {selfieUri ? (
                    <Image
                        source={{ uri: selfieUri }}
                        style={styles.selfiePreview}
                        accessibilityLabel="Verification selfie preview"
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
            {cameraError ? <Text accessibilityRole="alert" style={{ color: theme.colors.destructive }}>{cameraError}</Text> : null}
            </>
            ) : null}

            {beat === 1 ? (
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
            ) : null}
        </>
    );
}

const styles = StyleSheet.create({
    hero: {
        gap: SPACING.tight,
    },
    photoRow: {
        flexDirection: 'row',
        gap: SPACING.tight,
    },
    profileThumb: {
        width: 56,
        height: 72,
        borderRadius: RADIUS.md,
        backgroundColor: '#EDEBF0',
    },
    selfiePreview: {
        width: '100%',
        height: 160,
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
