import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
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

const UPLOAD_STAGES = [
    {
        key: 'upload',
        badge: 'Step 1 of 2',
        title: 'Uploading your selfie',
        body: 'Saving your selfie and sending it in.',
        progress: 0.3,
    },
    {
        key: 'queue',
        badge: 'Step 2 of 2',
        title: 'Starting your check',
        body: 'Your verification is lined up and about to run.',
        progress: 0.5,
    },
] as const;

const PROCESSING_STAGES = [
    {
        key: 'read',
        badge: 'Step 1 of 3',
        title: 'Reading your selfie',
        body: 'Checking that your face is clear and easy to read.',
        progress: 0.68,
    },
    {
        key: 'match',
        badge: 'Step 2 of 3',
        title: 'Matching your photos',
        body: 'Comparing your selfie with your profile photos.',
        progress: 0.84,
    },
    {
        key: 'finish',
        badge: 'Step 3 of 3',
        title: 'Finishing up',
        body: 'Wrapping up the final checks now.',
        progress: 0.96,
    },
] as const;

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
    const [overlayStageIndex, setOverlayStageIndex] = useState(0);
    const [resultStateDismissed, setResultStateDismissed] = useState(false);
    const resultScale = useState(() => new Animated.Value(0.92))[0];
    const resultOpacity = useState(() => new Animated.Value(0))[0];

    const profilePhotoUrls = useMemo(
        () => (profile?.photos ?? []).filter((photo: string | undefined | null): photo is string => !!photo).slice(0, 4),
        [profile?.photos],
    );

    useEffect(() => {
        if (!isProfileLoading && profile && hasVerifiedFace(profile)) {
            router.replace('/' as any);
        }
    }, [isProfileLoading, profile, router]);

    const status = latestSession?.status ?? profile?.faceVerificationStatus ?? 'not_started';
    const isProcessing = status === 'processing';
    const canRetry = status === 'retry_required' || status === 'failed';
    const showSuccessState = status === 'verified';
    const showRetryState = canRetry && !resultStateDismissed;
    const retryGuidance = useMemo(
        () =>
            getVerificationRetryGuidance({
                status,
                failureReasons: latestSession?.failureReasons ?? [],
                results: latestSession?.results ?? [],
                supportedProfilePhotoCount: profilePhotoUrls.length,
                unsupportedProfilePhotoCount: 0,
            }),
        [
            latestSession?.failureReasons,
            latestSession?.results,
            status,
            profilePhotoUrls.length,
        ],
    );

    useEffect(() => {
        setResultStateDismissed(false);
    }, [latestSession?.id, status]);

    useEffect(() => {
        if (!showSuccessState && !showRetryState) {
            resultOpacity.setValue(0);
            resultScale.setValue(0.92);
            return;
        }

        resultOpacity.setValue(0);
        resultScale.setValue(0.92);

        Animated.parallel([
            Animated.timing(resultOpacity, {
                toValue: 1,
                duration: 280,
                useNativeDriver: true,
            }),
            Animated.spring(resultScale, {
                toValue: 1,
                friction: 7,
                tension: 70,
                useNativeDriver: true,
            }),
        ]).start();
    }, [resultOpacity, resultScale, showRetryState, showSuccessState]);

    useEffect(() => {
        if (!isUploadingAndSubmitting && !isProcessing) {
            setOverlayStageIndex(0);
            return;
        }

        const activeStages = isUploadingAndSubmitting ? UPLOAD_STAGES : PROCESSING_STAGES;
        const interval = setInterval(() => {
            setOverlayStageIndex((current) => {
                if (current >= activeStages.length - 1) {
                    return current;
                }

                return current + 1;
            });
        }, isUploadingAndSubmitting ? 900 : 1800);

        return () => clearInterval(interval);
    }, [isProcessing, isUploadingAndSubmitting]);

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

            let session = null;

            if (shouldRetryLatest) {
                try {
                    session = await retrySessionAsync();
                } catch (error) {
                    if (!isCannotRetrySessionError(error)) {
                        throw error;
                    }

                    session = await createSessionAsync();
                }
            } else if (canReuseLatestSession) {
                session = latestSession;
            } else {
                session = await createSessionAsync();
            }

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

            if (profilePhotoUrls.length < 2) {
                show({
                    message: 'Add at least 2 clear profile photos before you verify.',
                    variant: 'warning',
                });
                return;
            }

            await uploadAndSubmitAsync({
                sessionId: session.id,
                selfieUri,
                profilePhotoUrls,
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
    const activeOverlayStages = isUploadingAndSubmitting ? UPLOAD_STAGES : PROCESSING_STAGES;
    const activeOverlayStage = activeOverlayStages[Math.min(overlayStageIndex, activeOverlayStages.length - 1)];
    const profileSummary = profilePhotoUrls.length >= 2
        ? `${profilePhotoUrls.length} profile photos ready`
        : 'Add 2 profile photos to continue';

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={['#0f0d23', '#1a0d2e', '#0f0d23']} style={StyleSheet.absoluteFill} />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {showSuccessState ? (
                    <Animated.View
                        style={[
                            styles.resultCard,
                            styles.resultCardSuccess,
                            {
                                opacity: resultOpacity,
                                transform: [{ scale: resultScale }],
                            },
                        ]}
                    >
                        <View style={[styles.resultIconWrap, styles.resultIconWrapSuccess]}>
                            <CheckCircle size={54} color="#34d399" weight="fill" />
                        </View>
                        <Text style={styles.resultTitle}>You&apos;re verified</Text>
                        <Text style={styles.resultBody}>
                            Nice. Your profile is cleared and ready for the app.
                        </Text>
                        <Pressable
                            style={[styles.primaryButton, isBusy && styles.primaryButtonDisabled]}
                            onPress={handleContinueToApp}
                            disabled={isBusy}
                        >
                            {isBusy ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Continue to app</Text>
                            )}
                        </Pressable>
                    </Animated.View>
                ) : showRetryState ? (
                    <Animated.View
                        style={[
                            styles.resultCard,
                            styles.resultCardRetry,
                            {
                                opacity: resultOpacity,
                                transform: [{ scale: resultScale }],
                            },
                        ]}
                    >
                        <View style={[styles.resultIconWrap, styles.resultIconWrapRetry]}>
                            <WarningCircle size={52} color="#fb7185" weight="fill" />
                        </View>
                        <Text style={styles.resultTitle}>Verification needs another try</Text>
                        <Text style={styles.resultBody}>
                            {retryGuidance?.shortBody ?? 'Something was not clear enough in the last attempt.'}
                        </Text>

                        <View style={styles.resultTips}>
                            {(retryGuidance?.tips.slice(0, 2) ?? []).map((tip) => (
                                <View key={tip} style={styles.retryTipRow}>
                                    <View style={styles.retryTipDot} />
                                    <Text style={styles.retryTipText}>{tip}</Text>
                                </View>
                            ))}
                        </View>

                        <View style={styles.resultActions}>
                            <Pressable
                                style={styles.primaryButton}
                                onPress={() => setResultStateDismissed(true)}
                            >
                                <Text style={styles.primaryButtonText}>Try again</Text>
                            </Pressable>
                            {retryGuidance?.showPhotoAction ? (
                                <Pressable
                                    style={styles.resultSecondaryButton}
                                    onPress={() => router.push('/edit-profile' as any)}
                                >
                                    <Text style={styles.resultSecondaryButtonText}>Update photos</Text>
                                </Pressable>
                            ) : null}
                        </View>
                    </Animated.View>
                ) : (
                    <>
                        <View style={styles.hero}>
                            <View style={styles.iconWrap}>
                                <ShieldCheck size={30} color="#f472b6" weight="fill" />
                            </View>
                            <Text style={styles.title}>Quick face check</Text>
                            <Text style={styles.subtitle}>This helps keep profiles real.</Text>
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardTopRow}>
                                <Text style={styles.cardTitle}>Profile photos</Text>
                                <Text style={styles.cardMeta}>{profileSummary}</Text>
                            </View>

                            <View style={styles.photoRow}>
                                {profilePhotoUrls.slice(0, 4).map((photo: string, index: number) => (
                                    <Image key={`${photo}-${index}`} source={{ uri: photo }} style={styles.profileThumb} />
                                ))}
                            </View>
                            {profilePhotoUrls.length < 2 ? (
                                <Text style={styles.warningText}>
                                    You need at least 2 clear profile photos to finish this step.
                                </Text>
                            ) : null}
                            {profilePhotoUrls.length < 2 ? (
                                <Pressable style={styles.secondaryButton} onPress={() => router.push('/edit-profile' as any)}>
                                    <Text style={styles.secondaryButtonText}>Update profile photos</Text>
                                </Pressable>
                            ) : null}
                        </View>

                        <View style={styles.card}>
                            <View style={styles.cardTopRow}>
                                <Text style={styles.cardTitle}>Your selfie</Text>
                                <Text style={styles.cardMeta}>Good light. Face centered.</Text>
                            </View>

                            {selfieUri ? (
                                <Image source={{ uri: selfieUri }} style={styles.selfiePreview} />
                            ) : (
                                <Pressable style={styles.selfiePlaceholder} onPress={handleCaptureSelfie}>
                                    <Camera size={36} color="#f9a8d4" weight="duotone" />
                                    <Text style={styles.selfiePlaceholderText}>Take a quick selfie</Text>
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
                                ) : (
                                    <ShieldCheck size={20} color="#93c5fd" weight="fill" />
                                )}
                                <Text style={styles.statusTitle}>Status: {getFriendlyStatusLabel(status)}</Text>
                            </View>

                            <Text style={styles.statusCopy}>
                                {isProcessing ? 'Checking now.' : 'Take one selfie to keep moving.'}
                            </Text>
                        </View>

                        <Pressable
                            style={[styles.primaryButton, (isBusy || (isProcessing && !canRetry)) && styles.primaryButtonDisabled]}
                            onPress={handleStartOrRetry}
                            disabled={isBusy || isProcessing}
                        >
                            {isBusy ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.primaryButtonText}>Submit verification</Text>
                            )}
                        </Pressable>
                    </>
                )}
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
                                {activeOverlayStage?.badge ?? 'Working'}
                            </Text>
                        </View>

                        <Text style={styles.processingTitle}>
                            {activeOverlayStage?.title ?? 'Verification in progress'}
                        </Text>
                        <Text style={styles.processingCopy}>
                            {activeOverlayStage?.body ?? 'Your verification is moving to the next step.'}
                        </Text>

                        <View style={styles.progressTrack}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${Math.round((activeOverlayStage?.progress ?? 0) * 100)}%` as const },
                                ]}
                            />
                        </View>

                        <View style={styles.processingStageRow}>
                            {activeOverlayStages.map((stage, index) => {
                                const cappedIndex = Math.min(overlayStageIndex, activeOverlayStages.length - 1);
                                const isComplete = index < cappedIndex;
                                const isActive = index === cappedIndex;

                                return (
                                    <View key={stage.key} style={styles.processingStageItem}>
                                        <View
                                            style={[
                                                styles.processingStageDot,
                                                isComplete && styles.processingStageDotComplete,
                                                isActive && styles.processingStageDotActive,
                                            ]}
                                        />
                                        <Text
                                            style={[
                                                styles.processingStageLabel,
                                                isActive && styles.processingStageLabelActive,
                                            ]}
                                        >
                                            {index + 1}
                                        </Text>
                                    </View>
                                );
                            })}
                        </View>
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

    if (normalizedMessage.includes('cannot be retried')) {
        return 'That attempt has closed out, so we started a fresh check for you. Try again once more.';
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
    const photoRelatedReasonCount = input.failureReasons.filter((reason) =>
        PHOTO_RELATED_REASON_CODES.has(reason),
    ).length;
    const photoRelatedResultCount = input.results.filter((result) =>
        result.qualityFlags.some((flag) => PHOTO_RELATED_QUALITY_FLAGS.has(flag)),
    ).length;
    const photoIssueDetected =
        input.supportedProfilePhotoCount < 2 ||
        input.unsupportedProfilePhotoCount > 0 ||
        input.failureReasons.includes('insufficient_usable_profile_photos') ||
        photoRelatedReasonCount >= 2 ||
        photoRelatedResultCount >= 2;
    const onlyMatchIssue =
        input.failureReasons.length > 0 &&
        input.failureReasons.every((reason) => reason === 'insufficient_match_count');

    if (photoIssueDetected && selfieIssueDetected) {
        return {
            title: 'A quick photo refresh should help',
            shortBody: 'Refresh your selfie and profile photos, then try again.',
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
            shortBody: 'Swap in clearer photos, then try again.',
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
            shortBody: 'Take a fresh selfie with your full face in frame.',
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
            shortBody: 'Try a fresh selfie and check your profile photos.',
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
        shortBody: 'Try one more selfie and we will check it again.',
        body: 'Something in the last attempt was not clear enough. Try a fresh selfie and we will run it again.',
        tips: [
            'Use clear lighting and keep your face centered in frame.',
            'Take off anything covering your face and hold the phone steady.',
        ],
        showSelfieAction: true,
        showPhotoAction: false,
    };
}

function isCannotRetrySessionError(error: unknown) {
    return error instanceof Error && error.message.toLowerCase().includes('cannot be retried');
}

const PHOTO_RELATED_REASON_CODES = new Set([
    'no_face_detected',
    'invalid_image_format',
    'invalid_image_parameters',
    'image_too_large',
    'image_processing_failed',
    'insufficient_usable_profile_photos',
]);

const PHOTO_RELATED_QUALITY_FLAGS = new Set([
    'no_face_detected',
    'invalid_image_format',
    'invalid_image_parameters',
    'image_too_large',
    'image_processing_failed',
    'multiple_faces_detected',
    'multiple_target_faces',
]);

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
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
    },
    cardMeta: {
        color: '#f9a8d4',
        fontSize: 12,
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
        fontSize: 15,
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
        fontSize: 15,
        lineHeight: 22,
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
        lineHeight: 20,
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
    resultCard: {
        minHeight: 520,
        borderRadius: 30,
        paddingHorizontal: 24,
        paddingVertical: 30,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        borderWidth: 1,
    },
    resultCardSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.08)',
        borderColor: 'rgba(52, 211, 153, 0.22)',
    },
    resultCardRetry: {
        backgroundColor: 'rgba(251, 113, 133, 0.08)',
        borderColor: 'rgba(251, 113, 133, 0.22)',
    },
    resultIconWrap: {
        width: 104,
        height: 104,
        borderRadius: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    resultIconWrapSuccess: {
        backgroundColor: 'rgba(52, 211, 153, 0.12)',
    },
    resultIconWrapRetry: {
        backgroundColor: 'rgba(251, 113, 133, 0.12)',
    },
    resultTitle: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '800',
        textAlign: 'center',
    },
    resultBody: {
        color: '#cbd5e1',
        fontSize: 15,
        lineHeight: 23,
        textAlign: 'center',
        maxWidth: 320,
    },
    resultTips: {
        width: '100%',
        gap: 10,
        paddingTop: 6,
    },
    resultActions: {
        width: '100%',
        gap: 12,
        paddingTop: 8,
    },
    resultSecondaryButton: {
        borderRadius: 999,
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(148, 163, 184, 0.16)',
    },
    resultSecondaryButtonText: {
        color: '#e2e8f0',
        fontSize: 15,
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
    processingStageRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        paddingTop: 4,
    },
    processingStageItem: {
        alignItems: 'center',
        gap: 8,
    },
    processingStageDot: {
        width: 12,
        height: 12,
        borderRadius: 999,
        backgroundColor: 'rgba(148, 163, 184, 0.24)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    processingStageDotActive: {
        backgroundColor: '#f472b6',
        borderColor: '#f9a8d4',
        transform: [{ scale: 1.12 }],
    },
    processingStageDotComplete: {
        backgroundColor: '#34d399',
        borderColor: '#86efac',
    },
    processingStageLabel: {
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: '700',
    },
    processingStageLabelActive: {
        color: '#fff',
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
