import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTheme } from '@/hooks/use-theme';
import { OnboardingData } from '../../components/digital-dna/types';
import {
    WelcomeSplash,
    TermsAcceptance,
    TheEssentials,
    CoreProfileStep,
    CampusBasicsStep,
    PhotoMoment,
    ProfilePromptStep,
    LaunchCelebration,
} from '../../components/onboarding';
import { useImageUpload } from '@/hooks/use-image-upload';
import { getAuthToken, clearSession, getCurrentUser } from '@/lib/auth-helpers';
import { setCachedProfile } from '@/lib/session-cache';
import { devError, devLog } from '@/lib/dev-log';

// Steps: 0=Splash, 1=Terms, 2=Essentials, 3=CoreProfile, 4=CampusBasics, 5=Photos, 6=Prompt, 7=Celebration
type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
const PROMPT_RESPONSE_MAX_LENGTH = 150;

const getProfileSetupErrorMessage = (responseData: any, status: number) => {
    const serverMessage =
        typeof responseData?.message === 'string'
            ? responseData.message
            : typeof responseData?.error === 'string'
            ? responseData.error
            : '';

    const promptIssues = Array.isArray(responseData?.details)
        ? responseData.details.filter((issue: any) => Array.isArray(issue?.path) && issue.path[0] === 'prompts')
        : [];

    if (promptIssues.some((issue: any) => issue?.code === 'too_big' || String(issue?.message || '').includes('150'))) {
        return 'One of your prompt answers is too long. Please keep each answer under 150 characters.';
    }

    if (serverMessage.includes('prompts') && serverMessage.includes('150')) {
        return 'One of your prompt answers is too long. Please keep each answer under 150 characters.';
    }

    return serverMessage || `We could not save your profile right now. Please try again. (${status})`;
};

export default function OnboardingScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [step, setStep] = useState<OnboardingStep>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const { uploadImage } = useImageUpload();

    const [formData, setFormData] = useState<OnboardingData>({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        currentLocation: '',
        locationLatitude: '',
        locationLongitude: '',
        locationPermissionStatus: 'unknown',
        university: '',
        course: '',
        yearOfStudy: '',
        age: '',
        gender: '',
        lookingFor: '',
        zodiacSign: '',
        photos: [],
        personalityType: '',
        loveLanguage: '',
        sleepingHabits: '',
        drinkingPreference: '',
        workoutFrequency: '',
        socialMediaUsage: '',
        communicationStyle: '',
        interests: [],
        height: '',
        education: '',
        smoking: '',
        politics: '',
        religion: '',
        languages: [],
        personalityAnswers: {},
        lifestyleAnswers: {},
        prompts: [],
        aboutMe: '',
        bio: '',
        qualities: [],
        instagram: '',
        spotify: '',
        snapchat: '',
        readReceiptsEnabled: true,
        showActiveStatus: true,
    });

    useEffect(() => {
        const normalizeToken = (token: string) =>
            token.charAt(0).toUpperCase() + token.slice(1).toLowerCase();

        const toNameParts = (fullName?: string | null) => {
            if (!fullName?.trim()) {
                return { firstName: '', lastName: '' };
            }

            const cleaned = fullName.replace(/\s+/g, ' ').trim();
            const nameParts = cleaned.split(' ');
            const firstName = normalizeToken(nameParts[0] || '');
            const lastName = nameParts.slice(1).map(normalizeToken).join(' ') || '';

            return { firstName, lastName };
        };

        const fromEmail = (email?: string | null) => {
            if (!email?.includes('@')) {
                return { firstName: '', lastName: '' };
            }

            const [localPartRaw = '', domainRaw = ''] = email.toLowerCase().split('@');
            const localPart = localPartRaw.trim();
            const domain = domainRaw.trim();

            if (domain === 'privaterelay.appleid.com') {
                return { firstName: '', lastName: '' };
            }

            const hasSeparator = /[._-]/.test(localPart);
            const hasDigits = /\d/.test(localPart);

            if (!hasSeparator && hasDigits && localPart.length >= 8) {
                return { firstName: '', lastName: '' };
            }

            const tokens = localPart
                .replace(/[._-]+/g, ' ')
                .replace(/\d+/g, ' ')
                .split(' ')
                .map((token) => token.trim())
                .filter((token) => token.length > 0);

            if (tokens.length === 0) {
                return { firstName: '', lastName: '' };
            }

            if (tokens.every((token) => token.length <= 2)) {
                return { firstName: '', lastName: '' };
            }

            const firstName = normalizeToken(tokens[0]);
            const lastName = tokens.length > 1
                ? tokens.slice(1).map(normalizeToken).join(' ')
                : 'Student';

            return { firstName, lastName };
        };

        const finalizeNames = (
            nameFromProfile: { firstName: string; lastName: string },
            email?: string | null
        ) => {
            const genericFirstNames = new Set(['user', 'unknown', 'apple', 'account']);
            let firstName = nameFromProfile.firstName.trim();
            let lastName = nameFromProfile.lastName.trim();

            const emailName = fromEmail(email);

            if (!firstName || genericFirstNames.has(firstName.toLowerCase())) {
                firstName = emailName.firstName || firstName;
            }

            if (!lastName) {
                lastName = emailName.lastName || 'Student';
            }

            if (!firstName) {
                firstName = 'Campus';
            }

            return { firstName, lastName };
        };

        const loadUserData = async () => {
            try {
                const user = await getCurrentUser();
                if (!user) {
                    return;
                }

                const normalized = finalizeNames(toNameParts(user.name), user.email);
                const firstName = normalized.firstName;
                const lastName = normalized.lastName;

                if (firstName) {
                    devLog('[Onboarding] Pre-populating name from auth user data');
                    setFormData((prev) => ({
                        ...prev,
                        firstName: prev.firstName || firstName,
                        lastName: prev.lastName || lastName,
                    }));
                }
            } catch (error) {
                devLog('[Onboarding] Could not load user data:', error);
            }
        };

        loadUserData();
    }, []);

    const updateData = useCallback((updates: Partial<OnboardingData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    }, []);

    const submitData = async () => {
        setIsSubmitting(true);
        setSubmitError(null);
        devLog('[Onboarding] Starting profile submission...');

        try {
            const token = await getAuthToken();
            devLog('[Onboarding] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');

            if (!token) {
                throw new Error('Not authenticated. Please log in again.');
            }

            devLog('[Onboarding] Photos to upload:', formData.photos.length);
            let uploadedPhotos = [...formData.photos];
            if (uploadedPhotos.length > 0) {
                uploadedPhotos = await Promise.all(uploadedPhotos.map(async (photo, index) => {
                    if (photo && !photo.startsWith('http')) {
                        devLog(`[Onboarding] Uploading photo ${index + 1}...`);
                        const uploaded = await uploadImage(photo);
                        devLog(`[Onboarding] Photo ${index + 1} uploaded:`, uploaded ? 'success' : 'failed');
                        return uploaded;
                    }
                    return photo;
                }));
            }
            devLog('[Onboarding] Photos after upload:', uploadedPhotos);

            const getInterestedIn = (lookingFor: string): string[] => {
                switch (lookingFor) {
                    case 'women':
                        return ['female'];
                    case 'men':
                        return ['male'];
                    case 'everyone':
                        return ['male', 'female', 'other'];
                    default:
                        return [];
                }
            };

            const sanitizedPrompts = (formData.prompts || [])
                .filter((prompt) => prompt.promptId && prompt.response)
                .map((prompt) => ({
                    ...prompt,
                    response: prompt.response.trim().slice(0, PROMPT_RESPONSE_MAX_LENGTH),
                }));

            const payload = {
                ...formData,
                lifestyleAnswers: {
                    ...formData.lifestyleAnswers,
                    relationshipGoal: formData.lifestyleAnswers.relationshipGoal,
                },
                prompts: sanitizedPrompts,
                photos: uploadedPhotos,
                profilePhoto: uploadedPhotos[0] ?? undefined,
                age: formData.age ? parseInt(String(formData.age)) : undefined,
                yearOfStudy: formData.yearOfStudy ? parseInt(String(formData.yearOfStudy)) : undefined,
                interestedIn: getInterestedIn(formData.lookingFor),
                isComplete: true,
                profileCompleted: true,
            };

            devLog('[Onboarding] Payload keys:', Object.keys(payload));
            devLog('[Onboarding] API URL:', `${process.env.EXPO_PUBLIC_API_URL}/api/user/me`);

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            devLog('[Onboarding] Response status:', response.status);

            const responseText = await response.text();
            devLog('[Onboarding] Response text:', responseText.substring(0, 500));

            let responseData: any = {};
            try {
                responseData = JSON.parse(responseText);
            } catch {
                devError('[Onboarding] Failed to parse response as JSON');
            }

            if (!response.ok) {
                devError('[Onboarding] Profile update failed:', response.status, responseData);

                if (response.status === 401) {
                    devLog('[Onboarding] Session expired - redirecting to login');
                    await clearSession();
                    Alert.alert(
                        'Session Expired',
                        'Please log in again to continue.',
                        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
                    );
                    return;
                }

                throw new Error(getProfileSetupErrorMessage(responseData, response.status));
            }

            devLog('[Onboarding] Profile saved successfully!');
            if (responseData?.data?.userId) {
                await setCachedProfile(responseData.data.userId, responseData.data);
            }

            const admission = responseData?.data?.admission;
            if (admission?.status === 'waitlisted') {
                router.replace('/waitlist' as any);
                return;
            }

            router.replace('/verification' as any);
        } catch (error: any) {
            devError('[Onboarding] Error:', error.message || error);
            setSubmitError(error.message || 'Failed to save your profile. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCelebrationComplete = () => {
        submitData();
    };

    const renderStep = () => {
        switch (step) {
            case 0:
                return (
                    <WelcomeSplash
                        onStart={() => setStep(1)}
                        onBackToLogin={() => {
                            clearSession();
                            router.replace('/(auth)/login');
                        }}
                    />
                );

            case 1:
                return (
                    <TermsAcceptance
                        onAccept={() => setStep(2)}
                    />
                );

            case 2:
                return (
                    <TheEssentials
                        data={{
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            phoneNumber: formData.phoneNumber,
                        }}
                        onUpdate={(data) => updateData(data as Partial<OnboardingData>)}
                        onNext={() => setStep(3)}
                    />
                );

            case 3:
                return (
                    <CoreProfileStep
                        globalStepIndex={3}
                        data={{
                            age: formData.age,
                            zodiacSign: formData.zodiacSign,
                            gender: formData.gender,
                            lookingFor: formData.lookingFor,
                            relationshipGoal: formData.lifestyleAnswers.relationshipGoal || '',
                        }}
                        onUpdate={(updates) => {
                            const nextUpdates: Partial<OnboardingData> = {};
                            if (updates.age !== undefined) nextUpdates.age = String(updates.age);
                            if (updates.zodiacSign !== undefined) nextUpdates.zodiacSign = updates.zodiacSign;
                            if (updates.gender !== undefined) nextUpdates.gender = updates.gender as OnboardingData['gender'];
                            if (updates.lookingFor !== undefined) nextUpdates.lookingFor = updates.lookingFor;
                            if (updates.relationshipGoal !== undefined) {
                                nextUpdates.lifestyleAnswers = {
                                    ...formData.lifestyleAnswers,
                                    relationshipGoal: updates.relationshipGoal,
                                };
                            }
                            updateData(nextUpdates);
                        }}
                        onComplete={() => setStep(4)}
                        onBackToEssentials={() => setStep(2)}
                    />
                );

            case 4:
                return (
                    <CampusBasicsStep
                        globalStepIndex={4}
                        data={{
                            yearOfStudy: formData.yearOfStudy,
                            interests: formData.interests,
                            currentLocation: formData.currentLocation,
                            locationLatitude: formData.locationLatitude,
                            locationLongitude: formData.locationLongitude,
                            locationPermissionStatus: formData.locationPermissionStatus,
                        }}
                        onUpdate={(updates) => updateData(updates as Partial<OnboardingData>)}
                        onComplete={() => setStep(5)}
                        onBackToCoreProfile={() => setStep(3)}
                    />
                );

            case 5:
                return (
                    <PhotoMoment
                        globalStepIndex={5}
                        photos={formData.photos}
                        onUpdate={(photos) => updateData({ photos })}
                        onNext={() => setStep(6)}
                        onBack={() => setStep(4)}
                    />
                );

            case 6:
                return (
                    <ProfilePromptStep
                        globalStepIndex={6}
                        prompts={formData.prompts}
                        onUpdate={(prompts) => updateData({ prompts })}
                        onComplete={() => setStep(7)}
                        onBack={() => setStep(5)}
                    />
                );

            case 7:
                return (
                    <LaunchCelebration
                        userName={formData.firstName}
                        mainPhoto={formData.photos[0]}
                        onComplete={handleCelebrationComplete}
                        onRetry={handleCelebrationComplete}
                        isLoading={isSubmitting}
                        hasError={!!submitError}
                        errorMessage={submitError || undefined}
                    />
                );

            default:
                return null;
        }
    };

    return (
        <SafeAreaView
            style={styles.container}
            edges={step === 0 || step === 1 ? ['bottom'] : ['top', 'bottom']}
        >
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <View style={styles.content}>
                {renderStep()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    content: {
        flex: 1,
    },
});
