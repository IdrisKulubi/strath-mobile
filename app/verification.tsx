import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing } from 'react-native';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { VerificationForm } from '@/components/verification/verification-form';
import { VerificationProcessingOverlay } from '@/components/verification/verification-processing-overlay';
import {
    VerificationRetryCard,
    VerificationSuccessCard,
} from '@/components/verification/verification-result-card';
import { VerificationShell } from '@/components/verification/verification-shell';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useFaceVerification } from '@/hooks/use-face-verification';
import { useProfile } from '@/hooks/use-profile';
import { hasVerifiedFace } from '@/lib/profile-access';
import { setCachedProfile } from '@/lib/session-cache';
import { formatVerificationTimestamp } from '@/lib/verification/decision-summary';
import {
    deriveProfilePhotoIssueSignals,
    getPhotoFailureCauseLine,
    getVerificationRetryGuidance,
} from '@/lib/verification/retry-guidance';
import {
    getVerificationUserMessage,
    isCannotRetrySessionError,
    isFirstAttemptVerificationFailure,
    isVerificationSessionExpired,
} from '@/lib/verification/verification-copy';
import { PROCESSING_STAGES, UPLOAD_STAGES } from '@/lib/verification/verification-stages';
import { MOTION } from '@/lib/design-tokens';
import { useToast } from '@/components/ui/toast';

export default function VerificationScreen() {
    const router = useRouter();
    const queryClient = useQueryClient();
    const { show } = useToast();
    const { data: profile, isLoading: isProfileLoading, refetch: refetchProfile } = useProfile();
    const {
        latestSession,
        pollTimedOut,
        lastSubmitQueued,
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
    const resultScale = useState(() => new Animated.Value(0.96))[0];
    const resultOpacity = useState(() => new Animated.Value(0))[0];
    const exitToTabsInFlightRef = useRef(false);

    const profilePhotoUrls = useMemo(
        () =>
            (profile?.photos ?? [])
                .filter((photo: string | undefined | null): photo is string => !!photo)
                .slice(0, 4),
        [profile?.photos],
    );

    const profilePhotoIssueSignals = useMemo(
        () => deriveProfilePhotoIssueSignals(latestSession?.results),
        [latestSession?.results],
    );

    const status = latestSession?.status ?? profile?.faceVerificationStatus ?? 'not_started';
    const isProcessing = status === 'processing';
    const canRetry = status === 'retry_required' || status === 'failed';

    const sessionVerified = latestSession?.status === 'verified';
    const profileVerified = Boolean(profile && hasVerifiedFace(profile));
    const shouldExitToTabs =
        !isProfileLoading &&
        !isSessionLoading &&
        Boolean(profile) &&
        (profileVerified || sessionVerified);

    useEffect(() => {
        if (!shouldExitToTabs) return;
        if (exitToTabsInFlightRef.current) return;
        exitToTabsInFlightRef.current = true;

        void (async () => {
            try {
                const refreshed = await refetchProfile();
                const p = refreshed.data ?? profile;
                if (!p?.userId) {
                    exitToTabsInFlightRef.current = false;
                    return;
                }

                let next = hasVerifiedFace(p)
                    ? p
                    : sessionVerified
                      ? {
                            ...p,
                            faceVerificationStatus: 'verified' as const,
                            faceVerifiedAt:
                                latestSession?.completedAt ??
                                p.faceVerifiedAt ??
                                new Date().toISOString(),
                        }
                      : null;

                if (!next || !hasVerifiedFace(next)) {
                    exitToTabsInFlightRef.current = false;
                    return;
                }

                queryClient.setQueryData(['profile'], next);
                await setCachedProfile(next.userId, next);
                router.replace('/(tabs)' as any);
            } catch {
                exitToTabsInFlightRef.current = false;
            }
        })();
    }, [
        shouldExitToTabs,
        sessionVerified,
        profile,
        latestSession?.completedAt,
        latestSession?.status,
        queryClient,
        router,
        refetchProfile,
    ]);

    const showSuccessState =
        !isProfileLoading && !isSessionLoading && status === 'verified' && !shouldExitToTabs;
    const showRetryState = canRetry && !resultStateDismissed;
    const retryGuidance = useMemo(
        () =>
            getVerificationRetryGuidance({
                status,
                failureReasons: latestSession?.failureReasons ?? [],
                results: latestSession?.results ?? [],
                supportedProfilePhotoCount: profilePhotoUrls.length,
                unsupportedProfilePhotoCount: profilePhotoIssueSignals.unsupportedProfilePhotoCount,
            }),
        [
            latestSession?.failureReasons,
            latestSession?.results,
            profilePhotoIssueSignals.unsupportedProfilePhotoCount,
            status,
            profilePhotoUrls.length,
        ],
    );

    const photoFailureCauseLine = useMemo(
        () => getPhotoFailureCauseLine(retryGuidance, latestSession?.failureReasons ?? []),
        [retryGuidance, latestSession?.failureReasons],
    );

    const retryShowPhoto = retryGuidance?.showPhotoAction ?? false;
    const retryShowSelfie = retryGuidance?.showSelfieAction ?? false;
    const showAssistance =
        showRetryState &&
        isFirstAttemptVerificationFailure(status, latestSession?.attemptNumber);

    const handleRetakeSelfieFromFailure = () => {
        setSelfieUri(null);
        setResultStateDismissed(true);
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    };

    const handleEditProfilePhotos = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        router.push({ pathname: '/edit-profile', params: { focus: 'photos' } } as any);
    };

    const handleDismissRetryCard = () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        setResultStateDismissed(true);
    };

    useEffect(() => {
        setResultStateDismissed(false);
    }, [latestSession?.id, status]);

    useEffect(() => {
        if (!showSuccessState && !showRetryState) {
            resultOpacity.setValue(0);
            resultScale.setValue(0.96);
            return;
        }

        resultOpacity.setValue(0);
        resultScale.setValue(0.96);

        Animated.parallel([
            Animated.timing(resultOpacity, {
                toValue: 1,
                duration: MOTION.short,
                easing: Easing.out(Easing.cubic),
                useNativeDriver: true,
            }),
            Animated.timing(resultScale, {
                toValue: 1,
                duration: MOTION.short,
                easing: Easing.out(Easing.cubic),
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
                Alert.alert(
                    'Camera access needed',
                    'Please allow camera access to capture your verification selfie.',
                );
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
        } catch {
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
            const canReuseLatestSession =
                latestSession?.status === 'pending_capture' &&
                !isVerificationSessionExpired(latestSession);

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

            if (session?.status && session.status !== 'pending_capture') {
                session = await createSessionAsync();
            }

            if (!session?.id) {
                throw new Error('Could not create a verification session. Please try again.');
            }

            if (!selfieUri) {
                show({
                    message: 'Take a selfie first so we can verify your profile.',
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
                message: 'We did the check. You are verified.',
                variant: 'success',
            });
        } catch (error) {
            show({
                message: getVerificationUserMessage(error),
                variant: 'danger',
                duration: 4500,
            });
        }
    };

    const getVerifiedProfileForRouting = () => {
        if (!profile) return null;
        if (hasVerifiedFace(profile)) return profile;
        if (latestSession?.status !== 'verified') return null;

        return {
            ...profile,
            faceVerificationStatus: 'verified' as const,
            faceVerifiedAt:
                latestSession.completedAt ?? profile.faceVerifiedAt ?? new Date().toISOString(),
        };
    };

    const handleContinueToApp = async () => {
        try {
            setIsContinuingToApp(true);
            const refreshed = await refetchProfile();
            const nextProfile = hasVerifiedFace(refreshed.data)
                ? refreshed.data
                : getVerifiedProfileForRouting();
            if (nextProfile?.userId) {
                queryClient.setQueryData(['profile'], nextProfile);
                await setCachedProfile(nextProfile.userId, nextProfile);
            }
            router.replace('/(tabs)' as any);
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
    const profileSummary =
        profilePhotoUrls.length >= 2
            ? `${profilePhotoUrls.length} ready`
            : 'Need 2 photos';
    const profileRetryCount = profile?.faceVerificationRetryCount ?? 0;
    const verifiedAtLabel = profile?.faceVerifiedAt
        ? formatVerificationTimestamp(profile.faceVerifiedAt)
        : null;

    const showForm = !showSuccessState && !showRetryState;
    const submitDisabled = isBusy || isProcessing;

    return (
        <>
            <VerificationShell
                loading={shouldExitToTabs}
                footer={
                    showForm ? (
                        <Button
                            onPress={handleStartOrRetry}
                            disabled={submitDisabled}
                            style={{ width: '100%', minHeight: 48 }}
                            accessibilityLabel="Submit face verification"
                        >
                            <Text>
                                {isUploadingAndSubmitting || isCreatingSession || isRetryingSession
                                    ? 'Please wait…'
                                    : 'Submit verification'}
                            </Text>
                        </Button>
                    ) : undefined
                }
            >
                {showSuccessState ? (
                    <VerificationSuccessCard
                        opacity={resultOpacity}
                        scale={resultScale}
                        session={latestSession}
                        profileRetryCount={profileRetryCount}
                        verifiedAtLabel={verifiedAtLabel}
                        isBusy={isBusy}
                        onContinue={handleContinueToApp}
                    />
                ) : null}

                {showRetryState ? (
                    <VerificationRetryCard
                        opacity={resultOpacity}
                        scale={resultScale}
                        guidance={retryGuidance}
                        photoFailureCauseLine={photoFailureCauseLine}
                        session={latestSession}
                        profileRetryCount={profileRetryCount}
                        showPhoto={retryShowPhoto}
                        showSelfie={retryShowSelfie}
                        showAssistance={showAssistance}
                        onEditProfilePhotos={handleEditProfilePhotos}
                        onRetakeSelfie={handleRetakeSelfieFromFailure}
                        onBackToForm={handleDismissRetryCard}
                    />
                ) : null}

                {showForm ? (
                    <VerificationForm
                        profilePhotoUrls={profilePhotoUrls}
                        profileSummary={profileSummary}
                        selfieUri={selfieUri}
                        status={status}
                        isProcessing={isProcessing}
                        latestSession={latestSession}
                        profileRetryCount={profileRetryCount}
                        pollTimedOut={pollTimedOut}
                        queuedBackground={lastSubmitQueued && isProcessing}
                        onCaptureSelfie={handleCaptureSelfie}
                        onEditProfilePhotos={handleEditProfilePhotos}
                    />
                ) : null}
            </VerificationShell>

            <VerificationProcessingOverlay
                visible={showProcessingOverlay}
                stage={activeOverlayStage}
                stageIndex={overlayStageIndex}
                stages={activeOverlayStages}
            />
        </>
    );
}
