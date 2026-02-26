import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingData } from '../../components/digital-dna/types';
import {
    WelcomeSplash,
    TermsAcceptance,
    TheEssentials,
    PhotoMoment,
    VibeCheckGame,
    BubblePicker,
    QuickFire,
    OpeningLine,
    LaunchCelebration,
} from '../../components/onboarding';
import { useImageUpload } from '@/hooks/use-image-upload';
import { getAuthToken, clearSession, getCurrentUser } from '@/lib/auth-helpers';

// Steps: 0=Splash, 1=Terms, 2=Essentials, 3=Photos, 4=VibeCheck, 5=Bubbles, 6=QuickFire, 7=OpeningLine, 8=Celebration
type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export default function OnboardingScreen() {
    const router = useRouter();
    const [step, setStep] = useState<OnboardingStep>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const { uploadImage } = useImageUpload();

    const [formData, setFormData] = useState<OnboardingData>({
        // Essentials
        firstName: '',
        lastName: '',
        phoneNumber: '',
        university: 'Strathmore University',
        course: '',
        yearOfStudy: '',
        age: '',
        gender: '',
        lookingFor: '',
        zodiacSign: '',
        // Photos
        photos: [],
        // Vibe Check results
        personalityType: '',
        loveLanguage: '',
        sleepingHabits: '',
        drinkingPreference: '',
        workoutFrequency: '',
        socialMediaUsage: '',
        communicationStyle: '',
        // Interests
        interests: [],
        // Quick Fire
        height: '',
        education: '',
        smoking: '',
        politics: '',
        religion: '',
        languages: [],
        // Opening Line
        prompts: [],
        aboutMe: '',
        bio: '',
        // Others
        qualities: [],
        instagram: '',
        spotify: '',
        snapchat: '',
        readReceiptsEnabled: true,
        showActiveStatus: true,
    });

    // Pre-populate name from auth user info (Apple/Google), with email fallback
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

            // Apple private relay addresses are anonymous aliases (e.g. random strings)
            // and should not be used to infer names.
            if (domain === 'privaterelay.appleid.com') {
                return { firstName: '', lastName: '' };
            }

            const hasSeparator = /[._-]/.test(localPart);
            const hasDigits = /\d/.test(localPart);

            // Heuristic: likely alias/random handle, avoid generating garbage names.
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

            // If what's left is mostly short fragments, don't treat it as a real name.
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
                    console.log('[Onboarding] Pre-populating name from auth user data');
                    setFormData((prev) => ({
                        ...prev,
                        firstName: prev.firstName || firstName,
                        lastName: prev.lastName || lastName,
                    }));
                }
            } catch (error) {
                console.log('[Onboarding] Could not load user data:', error);
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
        console.log('[Onboarding] Starting profile submission...');
        
        try {
            // Get auth token (works with both Better Auth and Apple Sign In)
            const token = await getAuthToken();
            console.log('[Onboarding] Token retrieved:', token ? `${token.substring(0, 20)}...` : 'null');

            if (!token) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // Upload photos first
            console.log('[Onboarding] Photos to upload:', formData.photos.length);
            let uploadedPhotos = [...formData.photos];
            if (uploadedPhotos.length > 0) {
                uploadedPhotos = await Promise.all(uploadedPhotos.map(async (photo, index) => {
                    if (photo && !photo.startsWith('http')) {
                        console.log(`[Onboarding] Uploading photo ${index + 1}...`);
                        const uploaded = await uploadImage(photo);
                        console.log(`[Onboarding] Photo ${index + 1} uploaded:`, uploaded ? 'success' : 'failed');
                        return uploaded;
                    }
                    return photo;
                }));
            }
            console.log('[Onboarding] Photos after upload:', uploadedPhotos);

            // Convert lookingFor to interestedIn array for matching algorithm
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

            // Prepare data for API - convert string fields to proper types
            console.log('[Onboarding] formData BEFORE creating payload:', {
                loveLanguage: formData.loveLanguage,
                communicationStyle: formData.communicationStyle,
                sleepingHabits: formData.sleepingHabits,
                workoutFrequency: formData.workoutFrequency,
                socialMediaUsage: formData.socialMediaUsage,
                drinkingPreference: formData.drinkingPreference,
                personalityType: formData.personalityType,
            });
            
            const payload = {
                ...formData,
                photos: uploadedPhotos,
                age: formData.age ? parseInt(String(formData.age)) : undefined,
                yearOfStudy: formData.yearOfStudy ? parseInt(String(formData.yearOfStudy)) : undefined,
                interestedIn: getInterestedIn(formData.lookingFor), // Set interestedIn from lookingFor selection
                isComplete: true,
                profileCompleted: true,
            };

            console.log('[Onboarding] Payload keys:', Object.keys(payload));
            console.log('[Onboarding] Vibe check fields in payload:', {
                loveLanguage: payload.loveLanguage,
                communicationStyle: payload.communicationStyle,
                sleepingHabits: payload.sleepingHabits,
                workoutFrequency: payload.workoutFrequency,
                socialMediaUsage: payload.socialMediaUsage,
                drinkingPreference: payload.drinkingPreference,
                personalityType: payload.personalityType,
                qualities: payload.qualities,
                prompts: payload.prompts,
                height: payload.height,
                smoking: payload.smoking,
                religion: payload.religion,
            });
            console.log('[Onboarding] API URL:', `${process.env.EXPO_PUBLIC_API_URL}/api/user/me`);

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            console.log('[Onboarding] Response status:', response.status);
            
            const responseText = await response.text();
            console.log('[Onboarding] Response text:', responseText.substring(0, 500));
            
            let responseData: any = {};
            try {
                responseData = JSON.parse(responseText);
            } catch {
                console.error('[Onboarding] Failed to parse response as JSON');
            }
            
            if (!response.ok) {
                console.error('[Onboarding] Profile update failed:', response.status, responseData);
                
                // Handle 401 Unauthorized - session expired or invalid
                if (response.status === 401) {
                    console.log('[Onboarding] Session expired - redirecting to login');
                    await clearSession();
                    Alert.alert(
                        'Session Expired',
                        'Please log in again to continue.',
                        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
                    );
                    return;
                }
                
                const errorMessage = responseData.error || responseData.message || `Server error: ${response.status}`;
                throw new Error(errorMessage);
            }

            console.log('[Onboarding] Profile saved successfully!');

            // Navigate directly to active Find experience (Wingman Explore)
            router.replace('/(tabs)/explore');
        } catch (error: any) {
            console.error('[Onboarding] Error:', error.message || error);
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
            // Step 0: Welcome Splash
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

            // Step 1: Terms & Privacy Acceptance (Required by Apple Guideline 1.2)
            case 1:
                return (
                    <TermsAcceptance
                        onAccept={() => setStep(2)}
                    />
                );

            // Step 2: The Essentials (Name, Phone, Birthday/Zodiac, Gender, Looking For)
            case 2:
                return (
                    <TheEssentials
                        data={{
                            firstName: formData.firstName,
                            lastName: formData.lastName,
                            phoneNumber: formData.phoneNumber,
                            age: typeof formData.age === 'string' ? parseInt(formData.age) || 0 : formData.age || 0,
                            zodiacSign: formData.zodiacSign,
                            gender: formData.gender,
                            lookingFor: formData.lookingFor,
                        }}
                        onUpdate={(data) => updateData(data as Partial<OnboardingData>)}
                        onNext={() => setStep(3)}
                    />
                );

            // Step 3: Photo Moment
            case 3:
                return (
                    <PhotoMoment
                        photos={formData.photos}
                        onUpdate={(photos) => updateData({ photos })}
                        onNext={() => setStep(4)}
                    />
                );

            // Step 4: Vibe Check Game (This or That)
            case 4:
                return (
                    <VibeCheckGame
                        onComplete={(results) => {
                            updateData({
                                personalityType: results.personalityType,
                                communicationStyle: results.communicationStyle,
                                sleepingHabits: results.sleepingHabits,
                                workoutFrequency: results.workoutFrequency,
                                socialMediaUsage: results.socialMediaUsage,
                                drinkingPreference: results.drinkingPreference,
                                loveLanguage: results.loveLanguage,
                            });
                            setStep(5);
                        }}
                    />
                );

            // Step 5: Bubble Picker for Interests
            case 5:
                return (
                    <BubblePicker
                        interests={formData.interests}
                        onComplete={(interests) => {
                            updateData({ interests });
                            setStep(6);
                        }}
                        minSelection={3}
                        maxSelection={10}
                    />
                );

            // Step 6: Quick Fire (Height, Year, Drinking, Smoking, Religion)
            case 6:
                return (
                    <QuickFire
                        data={{
                            height: formData.height,
                            course: formData.course,
                            yearOfStudy: typeof formData.yearOfStudy === 'string' 
                                ? parseInt(formData.yearOfStudy) || undefined 
                                : formData.yearOfStudy,
                            drinkingPreference: formData.drinkingPreference,
                            smoking: formData.smoking,
                            religion: formData.religion,
                            education: formData.education,
                        }}
                        onUpdate={(data) => {
                            const updates: Partial<OnboardingData> = {};
                            if (data.height !== undefined) updates.height = data.height;
                            if (data.course !== undefined) updates.course = data.course;
                            if (data.yearOfStudy !== undefined) updates.yearOfStudy = String(data.yearOfStudy);
                            if (data.drinkingPreference !== undefined) updates.drinkingPreference = data.drinkingPreference;
                            if (data.smoking !== undefined) updates.smoking = data.smoking;
                            if (data.religion !== undefined) updates.religion = data.religion;
                            if (data.education !== undefined) updates.education = data.education;
                            updateData(updates);
                        }}
                        onComplete={() => setStep(7)}
                    />
                );

            // Step 7: Opening Line (Prompts + Bio)
            case 7:
                return (
                    <OpeningLine
                        prompts={formData.prompts}
                        aboutMe={formData.aboutMe}
                        onUpdate={(data) => {
                            if (data.prompts) updateData({ prompts: data.prompts });
                            if (data.aboutMe) updateData({ aboutMe: data.aboutMe, bio: data.aboutMe });
                        }}
                        onComplete={() => setStep(8)}
                    />
                );

            // Step 8: Launch Celebration
            case 8:
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
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.content}>
                {renderStep()}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0d23',
    },
    content: {
        flex: 1,
    },
});
