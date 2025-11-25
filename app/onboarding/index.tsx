import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, StatusBar, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingData } from '../../components/digital-dna/types';
import Phase1IDCard from '../../components/digital-dna/Phase1IDCard';
import Phase2ProfileEssentials from '../../components/digital-dna/Phase2ProfileEssentials';
import Phase3VibeCheck from '../../components/digital-dna/Phase2VibeCheck'; // Renamed but keeping current file
import Phase4DeepDive from '../../components/digital-dna/Phase3DeepDive'; // Renamed but keeping current file
import Phase5SocialConnect from '../../components/digital-dna/Phase5SocialConnect';
import Phase6Launch from '../../components/digital-dna/Phase5Launch'; // Renamed but keeping current file
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

export default function OnboardingScreen() {
    const router = useRouter();
    const [phase, setPhase] = useState(1);
    const progressAnim = new Animated.Value(0);

    const [formData, setFormData] = useState<OnboardingData>({
        // Phase 1
        firstName: '',
        lastName: '',
        university: 'Strathmore University',
        course: '',
        yearOfStudy: '',
        age: '',
        gender: '',
        // Phase 2
        bio: '',
        lookingFor: '',
        photos: [],
        // Phase 3
        interests: [],
        // Phase 4
        zodiacSign: '',
        personalityType: '',
        loveLanguage: '',
        sleepingHabits: '',
        drinkingPreference: '',
        workoutFrequency: '',
        socialMediaUsage: '',
        communicationStyle: '',
        // Phase 5
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

    // Dynamic gradient colors based on phase (6 phases)
    const getGradientColors = (): [string, string, ...string[]] => {
        switch (phase) {
            case 1: // ID Card - Deep purple to dark purple
                return [Colors.dark.backgroundGradientStart, Colors.dark.backgroundGradientEnd, '#0f0820'];
            case 2: // Profile Essentials - Purple with pink glow
                return [Colors.dark.backgroundGradientStart, '#2d1347', Colors.dark.backgroundGradientEnd];
            case 3: // Vibe Check - Brighter purple
                return ['#3d1b5f', Colors.dark.backgroundGradientStart, '#1a0d2e'];
            case 4: // Deep Dive - Darker purple with magenta
                return ['#2d1b47', '#3d1347', '#2d0d3e'];
            case 5: // Social Connect - Vibrant gradient
                return ['#4d1b67', Colors.dark.backgroundGradientStart, Colors.dark.backgroundGradientEnd];
            case 6: // Launch - Celebratory pink-purple
                return ['#5d1b77', '#3d1b5f', Colors.dark.backgroundGradientEnd];
            default:
                return [Colors.dark.backgroundGradientStart, Colors.dark.backgroundGradientEnd, '#1a0d2e'];
        }
    };

    const updateData = (key: keyof OnboardingData, value: any) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const handleNext = async () => {
        if (phase < 6) {
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
        try {
            // Prepare data for API
            const payload = {
                ...formData,
                yearOfStudy: formData.yearOfStudy ? parseInt(formData.yearOfStudy) : undefined,
                isComplete: true,
                profileCompleted: true, // For backward compatibility if needed
            };

            const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/user/me`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Failed to update profile');
            }

            // Navigate to main app
            router.replace('/(tabs)');
        } catch (error) {
            console.error('Onboarding error:', error);
            Alert.alert('Error', 'Failed to save your profile. Please try again.');
        }
    };

    const renderPhase = () => {
        const props = {
            data: formData,
            updateData,
            onNext: handleNext,
            onBack: handleBack,
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
                return <Phase5SocialConnect {...props} />;
            case 6:
                return <Phase6Launch {...props} />;
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

            {/* Enhanced Progress Indicator */}
            <View style={styles.progressContainer}>
                {[1, 2, 3, 4, 5, 6].map((step) => (
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
