import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Pressable,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Camera, CheckCircle, Hourglass, ShieldCheck, WarningCircle } from 'phosphor-react-native';

import { useFaceVerification } from '@/hooks/use-face-verification';
import { useProfile } from '@/hooks/use-profile';
import { hasVerifiedFace } from '@/lib/profile-access';
import { useToast } from '@/components/ui/toast';

export default function VerificationScreen() {
    const router = useRouter();
    const { show } = useToast();
    const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile();
    const {
        latestSession,
        createSessionAsync,
        retrySessionAsync,
        uploadAndSubmitAsync,
        isLoading: isSessionLoading,
        isCreatingSession,
        isRetryingSession,
        isUploadingAndSubmitting,
    } = useFaceVerification();
    const [selfieUri, setSelfieUri] = useState<string | null>(null);
    const [isContinuingToApp, setIsContinuingToApp] = useState(false);

    const profilePhotoUrls = useMemo(
        () => (profile?.photos ?? []).filter((photo: string | undefined | null): photo is string => !!photo).slice(0, 4),
        [profile?.photos],
    );
    const supportedProfilePhotoUrls = useMemo(
        () => profilePhotoUrls.filter(isRekognitionSupportedProfilePhoto),
        [profilePhotoUrls],
    );
    const unsupportedProfilePhotoUrls = useMemo(
        () => profilePhotoUrls.filter((photo: string) => !isRekognitionSupportedProfilePhoto(photo)),
        [profilePhotoUrls],
    );
    const processingSteps = useMemo(
        () => [
            'Lining up your selfie with your profile...',
            'Doing a quick account check...',
            'Almost there. Finishing the final pass...',
        ],
        [],
    );
    const [processingStepIndex, setProcessingStepIndex] = useState(0);

    useEffect(() => {
        if (!isProfileLoading && profile && hasVerifiedFace(profile)) {
            router.replace('/' as any);
        }
    }, [isProfileLoading, profile, router]);

    const status = latestSession?.status ?? profile?.faceVerificationStatus ?? 'not_started';
    const isProcessing = status === 'processing';
    const canRetry = status === 'retry_required' || status === 'failed';
    const retryGuidance = useMemo(
        () =>
            getVerificationRetryGuidance({
                status,
                failureReasons: latestSession?.failureReasons ?? [],
                results: latestSession?.results ?? [],
                supportedProfilePhotoCount: supportedProfilePhotoUrls.length,
                unsupportedProfilePhotoCount: unsupportedProfilePhotoUrls.length,
            }),
        [
            latestSession?.failureReasons,
            latestSession?.results,
            status,
            supportedProfilePhotoUrls.length,
            unsupportedProfilePhotoUrls.length,
        ],
    );

    useEffect(() => {
        if (!isUploadingAndSubmitting && !isProcessing) {
            setProcessingStepIndex(0);
            return;
        }

        const interval = setInterval(() => {
            setProcessingStepIndex((current) => (current + 1) % processingSteps.length);
        }, 2200);

        return () => clearInterval(interval);
    }, [isProcessing, isUploadingAndSubmitting, processingSteps]);

    const handleCaptureSelfie = async () => {
        try {
            const permission = await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
                Alert.alert('Camera access needed', 'Please allow camera access to capture your verification selfie.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                cameraType: ImagePicker.CameraType.front,
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.85,
            });

            if (!result.canceled && result.assets[0]?.uri) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                setSelfieUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[Verification] Failed to capture selfie', error);
            show({
                message: 'Could not open the camera. Please try again.',
                variant: 'danger',
            });
        }
    };

    const handleStartOrRetry = async () => {
        try {
            const shouldRetryLatest =
                latestSession?.status === 'retry_required' || latestSession?.status === 'failed';
            const canReuseLatestSession = latestSession?.status === 'pending_capture';

            const session = shouldRetryLatest
                ? await retrySessionAsync()
                : canReuseLatestSession
                ? latestSession
                : await createSessionAsync();

            if (!session?.id) {
                throw new Error('Could not create a verification session. Please try again.');
            }

            if (!selfieUri) {
                show({
                    message: 'Take a quick selfie first so we can verify your profile.',
                    variant: 'warning',
                });
                return;
            }

            if (supportedProfilePhotoUrls.length < 2) {
                show({
                    message: 'Add at least 2 clear profile photos before you verify.',
                    variant: 'warning',
                });
                return;
            }

            await uploadAndSubmitAsync({
                sessionId: session.id,
                selfieUri,
                profilePhotoUrls: supportedProfilePhotoUrls,
            });
            await refetchProfile();
            show({
                message: 'Selfie submitted. We are checking everything now.',
                variant: 'success',
            });
        } catch (error) {
            console.error('[Verification] Failed to submit verification', error);
            show({
                message: getVerificationUserMessage(error),
                variant: 'danger',
                duration: 4500,
            });
        }
    };

    const handleContinueToApp = async () => {
        try {
            setIsContinuingToApp(true);
            await refetchProfile();
            router.replace('/' as any);
        } finally {
            setIsContinuingToApp(false);
        }
    };

    const isBusy =
        isProfileLoading ||
        isSessionLoading ||
        isCreatingSession ||
        isRetryingSession ||
        isUploadingAndSubmitting ||
        isContinuingToApp;
    const showProcessingOverlay = isUploadingAndSubmitting || isProcessing;
    const progressValue = isUploadingAndSubmitting ? 0.38 : isProcessing ? 0.82 : 0;
    const processingHeadline = isUploadingAndSubmitting
        ? 'Uploading your selfie...'
        : 'Verification in progress';
    const processingSubcopy = isUploadingAndSubmitting
        ? 'Saving your selfie and getting everything ready.'
        : processingSteps[processingStepIndex];

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0d23', '#1a0d2e', '#0f0d23']} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <View style={styles.iconWrap}>
                        <ShieldCheck size={30} color="#f472b6" weight="fill" />
                    </View>
                    <Text style={styles.title}>Verify your face before matchmaking</Text>
                    <Text style={styles.subtitle}>
                        This helps us reduce catfishing, fake accounts, and low-effort bot profiles before you appear in discovery.
                    </Text>
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Profile photo check</Text>
                    <Text style={styles.cardCopy}>
                        We will compare one guided selfie with your uploaded profile photos. Make sure your face is clear, centered, and well lit.
                    </Text>
                    <Text style={styles.cardHint}>
                        Clear, recent photos give you the smoothest verification.
                    </Text>

                    <View style={styles.photoRow}>
                        {profilePhotoUrls.slice(0, 4).map((photo: string, index: number) => (
                            <Image key={`${photo}-${index}`} source={{ uri: photo }} style={styles.profileThumb} />
                        ))}
                    </View>
                    {supportedProfilePhotoUrls.length < 2 ? (
                        <Text style={styles.warningText}>
                            You need at least 2 clear profile photos to finish this step.
                        </Text>
                    ) : null}
                    {unsupportedProfilePhotoUrls.length > 0 ? (
                        <Text style={styles.warningSubtext}>
                            Some of your current photos may need a quick re-upload before this can finish smoothly.
                        </Text>
                    ) : null}
                    {unsupportedProfilePhotoUrls.length > 0 || supportedProfilePhotoUrls.length < 2 ? (
                        <Pressable style={styles.secondaryButton} onPress={() => router.push('/edit-profile' as any)}>
                            <Text style={styles.secondaryButtonText}>Update profile photos</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Selfie capture</Text>
                    <Text style={styles.cardCopy}>
                        Use your front camera and look straight at the screen. We can add multi-angle prompts in the next iteration, but this gets the flow live now.
                    </Text>

                    {selfieUri ? (
                        <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
                    ) : (
                        <Pressable style={styles.selfiePlaceholder} onPress={handleCaptureSelfie}>
                            <Camera size={36} color="#f9a8d4" weight="duotone" />
                            <Text style={styles.selfiePlaceholderText}>Take selfie</Text>
                        </Pressable>
                    )}

                    {selfieUri ? (
                        <Pressable style={styles.secondaryButton} onPress={handleCaptureSelfie}>
                            <Text style={styles.secondaryButtonText}>Retake selfie</Text>
                        </Pressable>
                    ) : null}
                </View>

                <View style={styles.statusCard}>
                    <View style={styles.statusHeader}>
                        {isProcessing ? (
                            <Hourglass size={20} color="#fbbf24" weight="fill" />
                        ) : canRetry ? (
                            <WarningCircle size={20} color="#fb7185" weight="fill" />
                        ) : status === 'verified' ? (
                            <CheckCircle size={20} color="#34d399" weight="fill" />
                        ) : (
                            <ShieldCheck size={20} color="#93c5fd" weight="fill" />
                        )}
                        <Text style={styles.statusTitle}>Status: {getFriendlyStatusLabel(status)}</Text>
                    </View>

                    <Text style={styles.statusCopy}>
                        {isProcessing
                            ? 'Your selfie is being checked right now.'
                            : canRetry
                            ? retryGuidance?.body ?? 'Almost there. We just need one more try.'
                            : status === 'verified'
                            ? 'Your face is verified. You can continue to the app.'
                            : 'Complete this step to unlock discovery and matchmaking.'}
                    </Text>
                </View>

                {retryGuidance ? (
                    <View style={styles.retryCard}>
                        <Text style={styles.retryEyebrow}>What to fix</Text>
                        <Text style={styles.retryTitle}>{retryGuidance.title}</Text>
                        <Text style={styles.retryBody}>{retryGuidance.body}</Text>

                        <View style={styles.retryTips}>
                            {retryGuidance.tips.map((tip) => (
                                <View key={tip} style={styles.retryTipRow}>
                                    <View style={styles.retryTipDot} />
                                    <Text style={styles.retryTipText}>{tip}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.retryActions}>
                            {retryGuidance.showSelfieAction ? (
                                <Pressable style={styles.retryGhostButton} onPress={handleCaptureSelfie}>
                                    <Text style={styles.retryGhostButtonText}>Retake selfie</Text>
                                </Pressable>
                            ) : null}
                            {retryGuidance.showPhotoAction ? (
                                <Pressable style={styles.retryGhostButton} onPress={() => router.push('/edit-profile' as any)}>
                                    <Text style={styles.retryGhostButtonText}>Update profile photos</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </View>
                ) : null}

                <Pressable
                    style={[styles.primaryButton, (isBusy || (isProcessing && !canRetry)) && styles.primaryButtonDisabled]}
                    onPress={status === 'verified' ? handleContinueToApp : handleStartOrRetry}
                    disabled={isBusy || isProcessing}
                >
                    {isBusy ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <Text style={styles.primaryButtonText}>
                            {status === 'verified'
                                ? 'Continue to app'
                                : canRetry
                                ? 'Retry verification'
                                : 'Submit verification'}
                        </Text>
                    )}
                </Pressable>
            </ScrollView>

            <Modal visible={showProcessingOverlay} transparent animationType="fade" statusBarTranslucent>
                <View style={styles.processingOverlay}>
                    <LinearGradient
                        colors={['rgba(15,13,35,0.96)', 'rgba(26,13,46,0.98)', 'rgba(15,13,35,0.96)']}
                        style={styles.processingCard}
                    >
                        <View style={styles.processingBadge}>
                            <Hourglass size={22} color="#fbbf24" weight="fill" />
                            <Text style={styles.processingBadgeText}>
                                {isUploadingAndSubmitting ? 'Uploading' : 'Cooking'}
                            </Text>
                        </View>

                        <Text style={styles.processingTitle}>{processingHeadline}</Text>
                        <Text style={styles.processingCopy}>{processingSubcopy}</Text>

                        <View style={styles.progressTrack}>
                            <View style={[styles.progressFill, { width: `${progressValue * 100}%` }]} />
                        </View>

                        <Text style={styles.processingMeta}>
                            {isUploadingAndSubmitting
                                ? 'Hold tight, we are getting this ready for you.'
                                : 'Stay here for a sec while we finish things up.'}
                        </Text>
                    </LinearGradient>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

function getVerificationUserMessage(error: unknown) {
    const fallback = 'We could not finish verification right now. Please try again.';

    if (!(error instanceof Error)) {
        return fallback;
    }

    const normalizedMessage = error.message.toLowerCase();

    if (normalizedMessage.includes('at least 2') && normalizedMessage.includes('profile')) {
        return 'Add at least 2 clear profile photos, then try again.';
    }

    if (normalizedMessage.includes('session')) {
        return 'Something timed out in the background. Try again and we will restart it cleanly.';
    }

    if (normalizedMessage.includes('upload')) {
        return 'Your selfie did not upload properly. Try again with a steady connection.';
    }

    if (normalizedMessage.includes('selfie')) {
        return 'That selfie did not come through clearly. Retake it and try again.';
    }

    if (
        normalizedMessage.includes('comparefaces') ||
        normalizedMessage.includes('rekognition') ||
        normalizedMessage.includes('image format')
    ) {
        return 'Some of your photos need a quick refresh before we can finish verification.';
    }

    return error.message || fallback;
}

function getFriendlyStatusLabel(status: string) {
    switch (status) {
        case 'retry_required':
            return 'Needs another try';
        case 'manual_review':
            return 'Under review';
        case 'not_started':
            return 'Not started';
        default:
            return status.replace(/_/g, ' ');
    }
}

function getVerificationRetryGuidance(input: {
    status: string;
    failureReasons: string[];
    results: { qualityFlags: string[] }[];
    supportedProfilePhotoCount: number;
    unsupportedProfilePhotoCount: number;
}) {
    if (input.status !== 'retry_required' && input.status !== 'failed') {
        return null;
    }

    const selfieIssueDetected = input.failureReasons.includes('selfie_face_not_detected');
    const photoIssueDetected =
        input.supportedProfilePhotoCount < 2 ||
        input.unsupportedProfilePhotoCount > 0 ||
        input.failureReasons.some((reason) => PHOTO_RELATED_REASON_CODES.has(reason)) ||
        input.results.some((result) => result.qualityFlags.some((flag) => PHOTO_RELATED_QUALITY_FLAGS.has(flag)));
    const onlyMatchIssue =
        input.failureReasons.length > 0 &&
        input.failureReasons.every((reason) => reason === 'insufficient_match_count');

    if (photoIssueDetected && selfieIssueDetected) {
        return {
            title: 'A quick photo refresh should help',
            body: 'A fresh selfie plus a quick update to your profile photos should give this the best chance of passing.',
            tips: [
                'Use at least 2 clear solo photos where your face is easy to see.',
                'Retake your selfie in good light with your full face in frame.',
            ],
            showSelfieAction: true,
            showPhotoAction: true,
        };
    }

    if (photoIssueDetected) {
        return {
            title: 'Your profile photos need a quick update',
            body: 'At least one of your current photos is too hard to verify. Swap in clearer photos and try again.',
            tips: [
                'Use at least 2 recent photos where your face is front and center.',
                'Avoid group shots, heavy filters, and photos where your face is partly covered.',
            ],
            showSelfieAction: false,
            showPhotoAction: true,
        };
    }

    if (selfieIssueDetected) {
        return {
            title: 'Your selfie needs another go',
            body: 'We could not clearly read the selfie from the last attempt. Take a fresh one and keep your full face in frame.',
            tips: [
                'Use soft, even lighting and hold the phone steady.',
                'Look straight at the camera and avoid sunglasses, masks, or strong filters.',
            ],
            showSelfieAction: true,
            showPhotoAction: false,
        };
    }

    if (onlyMatchIssue) {
        return {
            title: 'We need a closer match',
            body: 'Try a fresh selfie and make sure your profile photos still look like you right now.',
            tips: [
                'Use recent profile photos with a clear view of your face.',
                'Retake your selfie in good light and keep your face centered.',
            ],
            showSelfieAction: true,
            showPhotoAction: true,
        };
    }

    return {
        title: 'One more try should do it',
        body: 'Something in the last attempt was not clear enough. Refresh your selfie or photos, then try again.',
        tips: [
            'Make sure your face is easy to see in both your selfie and profile photos.',
            'Use clear lighting and avoid blurry or heavily edited images.',
        ],
        showSelfieAction: true,
        showPhotoAction: true,
    };
}

const PHOTO_RELATED_REASON_CODES = new Set([
    'no_face_detected',
    'invalid_image_format',
    'invalid_image_parameters',
    'image_too_large',
    'image_processing_failed',
]);

const PHOTO_RELATED_QUALITY_FLAGS = new Set([
    'no_face_detected',
    'invalid_image_format',
    'invalid_image_parameters',
    'image_too_large',
    'image_processing_failed',
]);

function isRekognitionSupportedProfilePhoto(url: string) {
    const sanitized = url.split('?')[0]?.toLowerCase() ?? '';
    return sanitized.endsWith('.jpg') || sanitized.endsWith('.jpeg') || sanitized.endsWith('.png');
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0d23',
    },
    content: {
        paddingHorizontal: 24,
        paddingVertical: 28,
        gap: 18,
    },
    hero: {
        gap: 12,
    },
    iconWrap: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(244, 114, 182, 0.14)',
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
    },
    subtitle: {
        color: '#a5b4fc',
        fontSize: 15,
        lineHeight: 23,
    },
    card: {
        backgroundColor: 'rgba(15, 23, 42, 0.56)',
        borderRadius: 24,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(148, 163, 184, 0.16)',
        gap: 14,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    cardCopy: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 22,
    },
    cardHint: {
        color: '#f9a8d4',
        fontSize: 12,
        lineHeight: 18,
    },
    photoRow: {
        flexDirection: 'row',
        gap: 10,
    },
    profileThumb: {
        width: 64,
        height: 82,
        borderRadius: 16,
    },
    selfiePlaceholder: {
        height: 220,
        borderRadius: 24,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderColor: 'rgba(244, 114, 182, 0.35)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        backgroundColor: 'rgba(244, 114, 182, 0.06)',
    },
    selfiePlaceholderText: {
        color: '#f9a8d4',
        fontSize: 16,
        fontWeight: '700',
    },
    selfiePreview: {
        width: '100%',
        height: 320,
        borderRadius: 24,
    },
    secondaryButton: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(148, 163, 184, 0.18)',
    },
    secondaryButtonText: {
        color: '#e2e8f0',
        fontSize: 13,
        fontWeight: '700',
    },
    statusCard: {
        backgroundColor: 'rgba(30, 41, 59, 0.72)',
        borderRadius: 22,
        padding: 18,
        gap: 10,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    statusTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    statusCopy: {
        color: '#cbd5e1',
        fontSize: 14,
        lineHeight: 21,
    },
    warningText: {
        color: '#fda4af',
        fontSize: 12,
        lineHeight: 18,
    },
    warningSubtext: {
        color: '#fecdd3',
        fontSize: 12,
        lineHeight: 18,
    },
    retryCard: {
        backgroundColor: 'rgba(76, 29, 149, 0.24)',
        borderRadius: 22,
        padding: 18,
        borderWidth: 1,
        borderColor: 'rgba(196, 181, 253, 0.18)',
        gap: 12,
    },
    retryEyebrow: {
        color: '#c4b5fd',
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    retryTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '800',
    },
    retryBody: {
        color: '#e9d5ff',
        fontSize: 14,
        lineHeight: 22,
    },
    retryTips: {
        gap: 10,
    },
    retryTipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    retryTipDot: {
        width: 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: '#f472b6',
        marginTop: 6,
    },
    retryTipText: {
        flex: 1,
        color: '#f5d0fe',
        fontSize: 13,
        lineHeight: 20,
    },
    retryActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    retryGhostButton: {
        paddingHorizontal: 16,
        paddingVertical: 11,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(244, 114, 182, 0.3)',
        backgroundColor: 'rgba(244, 114, 182, 0.08)',
    },
    retryGhostButtonText: {
        color: '#fbcfe8',
        fontSize: 13,
        fontWeight: '700',
    },
    primaryButton: {
        backgroundColor: '#ec4899',
        borderRadius: 999,
        paddingVertical: 18,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: '#fff',
        fontWeight: '800',
        fontSize: 16,
    },
    processingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(4, 6, 18, 0.74)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    processingCard: {
        width: '100%',
        maxWidth: 360,
        borderRadius: 30,
        paddingHorizontal: 24,
        paddingVertical: 28,
        borderWidth: 1,
        borderColor: 'rgba(244, 114, 182, 0.22)',
        gap: 14,
    },
    processingBadge: {
        alignSelf: 'flex-start',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
        backgroundColor: 'rgba(251, 191, 36, 0.12)',
    },
    processingBadgeText: {
        color: '#fde68a',
        fontSize: 12,
        fontWeight: '800',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
    },
    processingTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        lineHeight: 30,
    },
    processingCopy: {
        color: '#e9d5ff',
        fontSize: 15,
        lineHeight: 23,
    },
    processingMeta: {
        color: '#cbd5e1',
        fontSize: 13,
        lineHeight: 20,
    },
    progressTrack: {
        height: 10,
        borderRadius: 999,
        backgroundColor: 'rgba(148, 163, 184, 0.18)',
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 999,
        backgroundColor: '#f472b6',
    },
});
