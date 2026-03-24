import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
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

    const profilePhotoUrls = useMemo(
        () => (profile?.photos ?? []).filter((photo: string | undefined | null): photo is string => !!photo).slice(0, 4),
        [profile?.photos],
    );

    useEffect(() => {
        if (!isProfileLoading && profile && hasVerifiedFace(profile)) {
            router.replace('/(tabs)' as any);
        }
    }, [isProfileLoading, profile, router]);

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
            const session = latestSession?.status === 'retry_required' || latestSession?.status === 'failed'
                ? await retrySessionAsync()
                : latestSession ?? await createSessionAsync();

            if (!selfieUri) {
                show({
                    message: 'Take a quick selfie first so we can verify your profile.',
                    variant: 'warning',
                });
                return;
            }

            if (profilePhotoUrls.length < 2) {
                show({
                    message: 'You need at least 2 profile photos before verification can run.',
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
                message: 'Verification submitted. We are checking your selfie now.',
                variant: 'success',
            });
        } catch (error) {
            console.error('[Verification] Failed to submit verification', error);
            show({
                message: error instanceof Error ? error.message : 'Verification failed to start.',
                variant: 'danger',
                duration: 4500,
            });
        }
    };

    const isBusy =
        isProfileLoading ||
        isSessionLoading ||
        isCreatingSession ||
        isRetryingSession ||
        isUploadingAndSubmitting;

    const status = latestSession?.status ?? profile?.faceVerificationStatus ?? 'not_started';
    const isProcessing = status === 'processing';
    const canRetry = status === 'retry_required' || status === 'failed';

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

                    <View style={styles.photoRow}>
                        {profilePhotoUrls.slice(0, 4).map((photo: string, index: number) => (
                            <Image key={`${photo}-${index}`} source={{ uri: photo }} style={styles.profileThumb} />
                        ))}
                    </View>
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
                        <Text style={styles.statusTitle}>Status: {formatStatus(status)}</Text>
                    </View>

                    <Text style={styles.statusCopy}>
                        {isProcessing
                            ? 'Your selfie has been submitted and is waiting for backend verification.'
                            : canRetry
                            ? 'This attempt needs another try. Capture a clearer selfie and submit again.'
                            : status === 'verified'
                            ? 'Your face is verified. You can continue to the app.'
                            : 'Complete this step to unlock discovery and matchmaking.'}
                    </Text>
                </View>

                <Pressable
                    style={[styles.primaryButton, (isBusy || (isProcessing && !canRetry)) && styles.primaryButtonDisabled]}
                    onPress={status === 'verified' ? () => router.replace('/(tabs)' as any) : handleStartOrRetry}
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
        </SafeAreaView>
    );
}

function formatStatus(status: string) {
    return status.replace(/_/g, ' ');
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
});
