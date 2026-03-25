import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInRight,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
    GraduationCap,
    InstagramLogo,
    MusicNotesSimple,
    SealCheck,
    Sparkle,
    Student,
    UsersThree,
} from 'phosphor-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import type { OnboardingData } from '@/components/digital-dna/types';
import {
    EDUCATION_OPTIONS,
    LANGUAGE_OPTIONS,
    POLITICS_OPTIONS,
    QUALITIES_OPTIONS,
} from '@/constants/profile-options';

type ProfileDetailsData = Pick<
    OnboardingData,
    'course' | 'education' | 'politics' | 'languages' | 'qualities' | 'instagram' | 'spotify' | 'snapchat'
>;

interface ProfileDetailsStepProps {
    data: ProfileDetailsData;
    onUpdate: (updates: Partial<ProfileDetailsData>) => void;
    onComplete: () => void;
    onBack: () => void;
}

type InnerStep = 0 | 1 | 2;

const TOTAL_STEPS = 3;

function SelectChip({
    label,
    selected,
    onPress,
    index,
}: {
    label: string;
    selected: boolean;
    onPress: () => void;
    index: number;
}) {
    return (
        <Animated.View entering={FadeInDown.delay(index * 35).springify()}>
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onPress();
                }}
            >
                <View style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
}

function SectionLabel({ title, subtitle }: { title: string; subtitle: string }) {
    return (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <Text style={styles.sectionSubtitle}>{subtitle}</Text>
        </View>
    );
}

export function ProfileDetailsStep({ data, onUpdate, onComplete, onBack }: ProfileDetailsStepProps) {
    const insets = useSafeAreaInsets();
    const progressWidth = useSharedValue(0);
    const [step, setStep] = useState<InnerStep>(0);

    const [course, setCourse] = useState(data.course ?? '');
    const [education, setEducation] = useState(data.education ?? '');
    const [politics, setPolitics] = useState(data.politics ?? '');
    const [languages, setLanguages] = useState<string[]>(data.languages ?? []);
    const [qualities, setQualities] = useState<string[]>(data.qualities ?? []);
    const [instagram, setInstagram] = useState(data.instagram ?? '');
    const [spotify, setSpotify] = useState(data.spotify ?? '');
    const [snapchat, setSnapchat] = useState(data.snapchat ?? '');

    useEffect(() => {
        progressWidth.value = withSpring(((step + 1) / TOTAL_STEPS) * 100, { damping: 15 });
    }, [progressWidth, step]);

    const progressStyle = useAnimatedStyle(() => ({
        width: `${progressWidth.value}%`,
    }));

    const canContinue = useMemo(() => {
        if (step === 0) {
            return course.trim().length >= 2 && education.length > 0;
        }

        if (step === 1) {
            return politics.length > 0 && languages.length > 0 && qualities.length >= 3;
        }

        return true;
    }, [course, education, languages, politics, qualities, step]);

    const handleToggleValue = useCallback((value: string, current: string[], setter: (next: string[]) => void) => {
        setter(
            current.includes(value)
                ? current.filter((item) => item !== value)
                : [...current, value]
        );
    }, []);

    const persistCurrentStep = useCallback(() => {
        if (step === 0) {
            onUpdate({
                course: course.trim(),
                education,
            });
            return;
        }

        if (step === 1) {
            onUpdate({
                politics,
                languages,
                qualities,
            });
            return;
        }

        onUpdate({
            instagram: instagram.trim().replace(/^@+/, ''),
            spotify: spotify.trim(),
            snapchat: snapchat.trim().replace(/^@+/, ''),
        });
    }, [
        course,
        education,
        instagram,
        languages,
        onUpdate,
        politics,
        qualities,
        snapchat,
        spotify,
        step,
    ]);

    const handleNext = useCallback(() => {
        if (!canContinue) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        persistCurrentStep();

        if (step === 2) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onComplete();
            return;
        }

        setStep((prev) => (prev + 1) as InnerStep);
    }, [canContinue, onComplete, persistCurrentStep, step]);

    const handleBack = useCallback(() => {
        if (step === 0) {
            onBack();
            return;
        }

        setStep((prev) => (prev - 1) as InnerStep);
    }, [onBack, step]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <LinearGradient colors={['#0f0d23', '#1a0d2e', '#0f0d23']} style={StyleSheet.absoluteFill} />

            <View style={[styles.progressContainer, { paddingTop: Math.max(insets.top + 12, 60) }]}>
                <TouchableOpacity onPress={handleBack} activeOpacity={0.7} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>

                <View style={styles.progressBarBg}>
                    <Animated.View style={[styles.progressBarFill, progressStyle]}>
                        <LinearGradient
                            colors={['#ec4899', '#f43f5e']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                </View>

                <View style={styles.progressInfo}>
                    <SealCheck size={16} color="#f59e0b" weight="fill" />
                    <Text style={styles.progressText}>Profile details</Text>
                    <Text style={styles.progressCount}>{step + 1}/{TOTAL_STEPS}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {step === 0 && (
                    <Animated.View key="identity" entering={SlideInRight.springify()} style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Student size={32} color="#ec4899" weight="fill" />
                        </View>

                        <Text style={styles.title}>Complete your campus card</Text>
                        <Text style={styles.subtitle}>
                            These details fill in the parts of your profile we were still missing.
                        </Text>

                        <SectionLabel title="Course" subtitle="What are you studying?" />
                        <View style={styles.inputShell}>
                            <GraduationCap size={18} color="#94a3b8" weight="fill" />
                            <TextInput
                                style={styles.input}
                                placeholder="Computer Science"
                                placeholderTextColor="#64748b"
                                value={course}
                                onChangeText={setCourse}
                            />
                        </View>

                        <SectionLabel title="Education" subtitle="Your current study level" />
                        <View style={styles.chipGroup}>
                            {EDUCATION_OPTIONS.map((option, index) => (
                                <SelectChip
                                    key={option}
                                    label={option}
                                    selected={education === option}
                                    onPress={() => setEducation(option)}
                                    index={index}
                                />
                            ))}
                        </View>
                    </Animated.View>
                )}

                {step === 1 && (
                    <Animated.View key="details" entering={SlideInRight.springify()} style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Sparkle size={32} color="#ec4899" weight="fill" />
                        </View>

                        <Text style={styles.title}>Tell us a bit more</Text>
                        <Text style={styles.subtitle}>
                            This helps your profile feel complete and gives matching a lot more signal.
                        </Text>

                        <SectionLabel title="Politics" subtitle="Pick the one that fits best" />
                        <View style={styles.chipGroup}>
                            {POLITICS_OPTIONS.map((option, index) => (
                                <SelectChip
                                    key={option}
                                    label={option}
                                    selected={politics === option}
                                    onPress={() => setPolitics(option)}
                                    index={index}
                                />
                            ))}
                        </View>

                        <SectionLabel title="Languages" subtitle="Choose every language you are comfortable using" />
                        <View style={styles.chipGroup}>
                            {LANGUAGE_OPTIONS.map((option, index) => (
                                <SelectChip
                                    key={option}
                                    label={option}
                                    selected={languages.includes(option)}
                                    onPress={() => handleToggleValue(option, languages, setLanguages)}
                                    index={index}
                                />
                            ))}
                        </View>

                        <SectionLabel title="Top qualities" subtitle="Pick at least 3 traits that feel like you" />
                        <View style={styles.chipGroup}>
                            {QUALITIES_OPTIONS.map((option, index) => (
                                <SelectChip
                                    key={option.value}
                                    label={option.label}
                                    selected={qualities.includes(option.value)}
                                    onPress={() => handleToggleValue(option.value, qualities, setQualities)}
                                    index={index}
                                />
                            ))}
                        </View>
                    </Animated.View>
                )}

                {step === 2 && (
                    <Animated.View key="socials" entering={SlideInRight.springify()} style={styles.content}>
                        <View style={styles.iconContainer}>
                            <UsersThree size={32} color="#ec4899" weight="fill" />
                        </View>

                        <Text style={styles.title}>Add your socials</Text>
                        <Text style={styles.subtitle}>
                            Optional, but this is where we capture the handles missing from your profile.
                        </Text>

                        <SectionLabel title="Instagram" subtitle="Your IG handle" />
                        <View style={styles.inputShell}>
                            <InstagramLogo size={18} color="#94a3b8" weight="fill" />
                            <TextInput
                                style={styles.input}
                                placeholder="@username"
                                placeholderTextColor="#64748b"
                                value={instagram}
                                onChangeText={setInstagram}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <SectionLabel title="Spotify" subtitle="Profile link or username" />
                        <View style={styles.inputShell}>
                            <MusicNotesSimple size={18} color="#94a3b8" weight="fill" />
                            <TextInput
                                style={styles.input}
                                placeholder="spotify.com/user/..."
                                placeholderTextColor="#64748b"
                                value={spotify}
                                onChangeText={setSpotify}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <SectionLabel title="Snapchat" subtitle="Your snap handle" />
                        <View style={styles.inputShell}>
                            <InstagramLogo size={18} color="#94a3b8" weight="fill" />
                            <TextInput
                                style={styles.input}
                                placeholder="@username"
                                placeholderTextColor="#64748b"
                                value={snapchat}
                                onChangeText={setSnapchat}
                                autoCapitalize="none"
                                autoCorrect={false}
                            />
                        </View>

                        <Animated.View entering={FadeIn.delay(250)} style={styles.tipCard}>
                            <Text style={styles.tipText}>
                                Add what you actually use. You can leave any of these blank and still continue.
                            </Text>
                        </Animated.View>
                    </Animated.View>
                )}
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity onPress={handleNext} activeOpacity={0.8} disabled={!canContinue}>
                    <LinearGradient
                        colors={canContinue ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                        style={styles.continueButton}
                    >
                        <Text style={[styles.continueButtonText, !canContinue && styles.disabledText]}>
                            {step === 2 ? 'Finish profile' : 'Continue'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.helperText}>
                    {step === 0 && 'Course and education help complete the basics.'}
                    {step === 1 && 'Select at least 1 language and 3 qualities to continue.'}
                    {step === 2 && 'Socials are optional, but this step makes sure we do not miss them.'}
                </Text>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    progressContainer: {
        paddingHorizontal: 24,
        paddingBottom: 16,
    },
    backButton: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        marginBottom: 14,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 12,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    progressText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f59e0b',
    },
    progressCount: {
        fontSize: 14,
        color: '#64748b',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 24,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 18,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(236,72,153,0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        lineHeight: 36,
        paddingTop: 2,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 26,
        lineHeight: 24,
    },
    sectionHeader: {
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        lineHeight: 20,
        color: '#94a3b8',
    },
    inputShell: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 16,
        marginBottom: 18,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        paddingVertical: 0,
    },
    chipGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 22,
    },
    chip: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        borderRadius: 18,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    chipSelected: {
        backgroundColor: 'rgba(236,72,153,0.18)',
        borderColor: '#ec4899',
    },
    chipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cbd5e1',
    },
    chipTextSelected: {
        color: '#fff',
    },
    tipCard: {
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderColor: 'rgba(255,255,255,0.09)',
        borderWidth: 1,
        borderRadius: 18,
        padding: 16,
        marginTop: 10,
    },
    tipText: {
        fontSize: 14,
        lineHeight: 22,
        color: '#cbd5e1',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        paddingTop: 10,
    },
    continueButton: {
        minHeight: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 17,
        fontWeight: '800',
        color: '#fff',
    },
    disabledText: {
        color: '#9ca3af',
    },
    helperText: {
        marginTop: 12,
        textAlign: 'center',
        fontSize: 13,
        lineHeight: 20,
        color: '#64748b',
    },
});
