import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingData } from '../../components/digital-dna/types';
import Phase1IDCard from '../../components/digital-dna/Phase1IDCard';
import Phase2ProfileEssentials from '../../components/digital-dna/Phase2ProfileEssentials';
import Phase3VibeCheck from '../../components/digital-dna/Phase2VibeCheck';
import Phase4DeepDive from '../../components/digital-dna/Phase3DeepDive';
import { Phase4Qualities } from '../../components/digital-dna/Phase4Qualities';
import { Phase5Prompts } from '../../components/digital-dna/Phase5Prompts';
import { Phase6AboutMe } from '../../components/digital-dna/Phase6AboutMe';
import { Phase7KnowMore } from '../../components/digital-dna/Phase7KnowMore';
import Phase5SocialConnect from '../../components/digital-dna/Phase5SocialConnect';
import Phase6Launch from '../../components/digital-dna/Phase5Launch';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useTheme } from '@/hooks/use-theme';

export default function OnboardingScreen() {
    const router = useRouter();
    const { isDark } = useTheme();
    const [phase, setPhase] = useState(1);
    const progressAnim = new Animated.Value(0);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { uploadImage } = useImageUpload();

    const [formData, setFormData] = useState<OnboardingData>({
        // Phase 1: ID Card
        firstName: '',
        lastName: '',
        university: 'Strathmore University',
        course: '',
        yearOfStudy: '',
        age: '',
        gender: '',
        // Phase 2: Profile Essentials
        bio: '',
        lookingFor: '',
        photos: [],
        // Phase 3: Vibe Check
        interests: [],
        // Phase 4: Deep Dive
        zodiacSign: '',
        personalityType: '',
        loveLanguage: '',
        sleepingHabits: '',
        drinkingPreference: '',
        workoutFrequency: '',
        socialMediaUsage: '',
        communicationStyle: '',
        // Phase 4: Qualities (NEW)
        qualities: [],
        // Phase 5: Prompts (NEW)
        prompts: [],
        // Phase 6: About Me (NEW)
        aboutMe: '',
        // Phase 7: Know More About Me (NEW)
        height: '',
        education: '',
        smoking: '',
        politics: '',
        religion: '',
        languages: [],
        // Phase 8: Social Connect
        instagram: '',
        spotify: '',
        snapchat: '',
        // Privacy defaults
        readReceiptsEnabled: true,
        showActiveStatus: true,
    });

    // Animate progress indicator when phase changes
    useEffect(() => {
        Animated.spring(progressAnim, {
            toValue: 1,
            useNativeDriver: true,
            tension: 50,
            friction: 7,
        }).start();
    }, [phase]);

    // Dynamic gradient colors based on phase (9 phases)
    const getGradientColors = (): [string, string, ...string[]] => {
        switch (phase) {
            case 1: // ID Card
                return [Colors.dark.backgroundGradientStart, Colors.dark.backgroundGradientEnd, '#0f0820'];
            case 2: // Profile Essentials
                return [Colors.dark.backgroundGradientStart, '#2d1347', Colors.dark.backgroundGradientEnd];
            case 3: // Vibe Check
                return ['#3d1b5f', Colors.dark.backgroundGradientStart, '#1a0d2e'];
            case 4: // Deep Dive
                return ['#2d1b47', '#3d1347', '#2d0d3e'];
            case 5: // Qualities
                return ['#4d1b5f', Colors.dark.backgroundGradientStart, '#2d0d3e'];
            case 6: // Prompts
                return ['#5d1b67', Colors.dark.backgroundGradientStart, '#3d1347'];
            case 7: // About Me
                return ['#3d1347', Colors.dark.backgroundGradientStart, '#2d0d3e'];
            case 8: // Know More
                return ['#4d1b5f', '#3d1347', Colors.dark.backgroundGradientEnd];
            case 9: // Social Connect & Launch
                return ['#5d1b77', '#3d1b5f', Colors.dark.backgroundGradientEnd];
            default:
                return [Colors.dark.backgroundGradientStart, Colors.dark.backgroundGradientEnd, '#1a0d2e'];
        }
    };

    const updateData = (key: keyof OnboardingData, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleNext = async () => {
        if (phase < 9) {
            setPhase(phase + 1);
        } else {
            await submitData();
        }
    };

    const handleBack = () => {
        if (phase > 1) {
            setPhase(phase - 1);
        }
    };

    const submitData = async () => {
        setIsSubmitting(true);
        try {
            // Get auth session for Authorization header
            const session = await import('@/lib/auth-client').then(m => m.authClient.getSession());
            const token = session.data?.session?.token;

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
                age: formData.age ? parseInt(formData.age) : undefined,
                yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : undefined,
                isComplete: true,
                profileCompleted: true, // For backward compatibility if needed
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

    const renderPhase = () => {
        const props = {
            data: formData,
            updateData,
            onNext: handleNext,
            onBack: handleBack,
            isSubmitting,
        };

        switch (phase) {
            case 1:
                return <Phase1IDCard {...props} />;
            case 2:
                return <Phase2ProfileEssentials {...props} />;
            case 3:
                return <Phase3VibeCheck {...props} />;
            case 4:
                return <Phase4DeepDive {...props} />;
            case 5:
                return (
                    <Phase4Qualities
                        selectedQualities={formData.qualities}
                        onSelect={(qualities) => updateData('qualities', qualities)}
                        isDark={isDark}
                    />
                );
            case 6:
                return (
                    <Phase5Prompts
                        prompts={formData.prompts}
                        onUpdate={(prompts) => updateData('prompts', prompts)}
                        isDark={isDark}
                    />
                );
            case 7:
                return (
                    <Phase6AboutMe
                        aboutMe={formData.aboutMe}
                        onUpdate={(aboutMe) => updateData('aboutMe', aboutMe)}
                        isDark={isDark}
                    />
                );
            case 8:
                return (
                    <Phase7KnowMore
                        data={{
                            height: formData.height,
                            exercise: formData.workoutFrequency,
                            education: formData.education,
                            smoking: formData.smoking,
                            lookingFor: formData.lookingFor,
                            politics: formData.politics,
                            religion: formData.religion,
                            languages: formData.languages,
                        }}
                        onUpdate={(updates) => {
                            if (updates.height !== undefined) updateData('height', updates.height);
                            if (updates.exercise !== undefined) updateData('workoutFrequency', updates.exercise);
                            if (updates.education !== undefined) updateData('education', updates.education);
                            if (updates.smoking !== undefined) updateData('smoking', updates.smoking);
                            if (updates.lookingFor !== undefined) updateData('lookingFor', updates.lookingFor);
                            if (updates.politics !== undefined) updateData('politics', updates.politics);
                            if (updates.religion !== undefined) updateData('religion', updates.religion);
                            if (updates.languages !== undefined) updateData('languages', updates.languages);
                        }}
                        isDark={isDark}
                    />
                );
            case 9:
                return <Phase5SocialConnect {...props} />;
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient
                colors={getGradientColors()}
                style={styles.background}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
            />
            <View style={styles.content}>
                {renderPhase()}
            </View>

            {/* Enhanced Progress Indicator - 9 phases */}
            <View style={styles.progressContainer}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((step) => (
                    <View
                        key={step}
                        style={[
                            styles.progressDot,
                            step === phase && styles.activeDot,
                            step < phase && styles.completedDot
                        ]}
                    />
                ))}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.dark.background,
    },
    background: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    content: {
        flex: 1,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingBottom: 20,
        paddingTop: 10,
        gap: 8,
    },
    progressDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.dark.muted,
        opacity: 0.4,
    },
    activeDot: {
        backgroundColor: Colors.dark.primary, // StrathSpace pink
        width: 24,
        opacity: 1,
        shadowColor: Colors.dark.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
    },
    completedDot: {
        backgroundColor: Colors.dark.accent, // Magenta
        opacity: 0.7,
    },
});
