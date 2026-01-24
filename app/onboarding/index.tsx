import React, { useState, useCallback } from 'react';
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
import { getAuthToken } from '@/lib/auth-helpers';

// Steps: 0=Splash, 1=Terms, 2=Essentials, 3=Photos, 4=VibeCheck, 5=Bubbles, 6=QuickFire, 7=OpeningLine, 8=Celebration
type OnboardingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export default function OnboardingScreen() {
    const router = useRouter();
    const [step, setStep] = useState<OnboardingStep>(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { uploadImage } = useImageUpload();

    const [formData, setFormData] = useState<OnboardingData>({
        // Essentials
        firstName: '',
        lastName: '',
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

    const updateData = useCallback((updates: Partial<OnboardingData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    }, []);

    const submitData = async () => {
        setIsSubmitting(true);
        try {
            // Get auth token (works with both Better Auth and Apple Sign In)
            const token = await getAuthToken();

            if (!token) {
                throw new Error('Not authenticated. Please log in again.');
            }

            // Upload photos first
            let uploadedPhotos = [...formData.photos];
            if (uploadedPhotos.length > 0) {
                uploadedPhotos = await Promise.all(uploadedPhotos.map(async (photo) => {
                    if (photo && !photo.startsWith('http')) {
                        return await uploadImage(photo);
                    }
                    return photo;
                }));
            }

            // Prepare data for API - convert string fields to proper types
            const payload = {
                ...formData,
                photos: uploadedPhotos,
                age: formData.age ? parseInt(String(formData.age)) : undefined,
                yearOfStudy: formData.yearOfStudy ? parseInt(String(formData.yearOfStudy)) : undefined,
                isComplete: true,
                profileCompleted: true,
            };

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Profile update failed:', response.status, errorData);
                throw new Error(errorData.message || 'Failed to update profile');
            }

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Onboarding error:', error);
            Alert.alert('Error', 'Failed to save your profile. Please try again.');
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
                    />
                );

            // Step 1: Terms & Privacy Acceptance (Required by Apple Guideline 1.2)
            case 1:
                return (
                    <TermsAcceptance
                        onAccept={() => setStep(2)}
                    />
                );

            // Step 2: The Essentials (Name, Birthday/Zodiac, Gender, Looking For)
            case 2:
                return (
                    <TheEssentials
                        data={{
                            firstName: formData.firstName,
                            lastName: formData.lastName,
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
                        isLoading={isSubmitting}
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
