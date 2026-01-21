import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    KeyboardAvoidingView,
    Platform,
    Dimensions,
    Alert,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useSharedValue,
    useAnimatedStyle,
    withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/hooks/use-theme';
import { useProfile, Profile } from '@/hooks/use-profile';
import { useImageUpload } from '@/hooks/use-image-upload';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
    CaretLeft,
    Check,
    User,
    Heart,
    GraduationCap,
    Sparkle,
    ChatCircle,
    Barbell,
    Globe,
    InstagramLogo,
    SpotifyLogo,
    Camera,
} from 'phosphor-react-native';
import { Ionicons } from '@expo/vector-icons';

import { PhotosEditor, SectionCard, ChipSelector } from '@/components/edit-profile';
import { StrengthMeter } from '@/components/profile/strength-meter';
import { SelectionSheet } from '@/components/ui/selection-sheet';
import { Skeleton } from '@/components/ui/skeleton';
import {
    GENDER_OPTIONS,
    LOOKING_FOR_OPTIONS,
    INTERESTED_IN_OPTIONS,
    ZODIAC_SIGNS,
    PERSONALITY_TYPES,
    LOVE_LANGUAGES,
    SLEEPING_HABITS,
    DRINKING_PREFERENCES,
    WORKOUT_FREQUENCY,
    SOCIAL_MEDIA_USAGE,
    COMMUNICATION_STYLE,
    QUALITIES_OPTIONS,
    HEIGHT_OPTIONS,
    EDUCATION_OPTIONS,
    SMOKING_OPTIONS,
    POLITICS_OPTIONS,
    RELIGION_OPTIONS,
    LANGUAGE_OPTIONS,
    PROMPT_OPTIONS,
} from '@/constants/profile-options';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Styled Input Component
const StyledInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline = false,
    maxLength,
    keyboardType = 'default',
    colors,
    isDark,
}: {
    label: string;
    value: string | undefined;
    onChangeText: (text: string) => void;
    placeholder: string;
    multiline?: boolean;
    maxLength?: number;
    keyboardType?: 'default' | 'numeric';
    colors: any;
    isDark: boolean;
}) => (
    <View style={styles.styledInputContainer}>
        <Text style={[styles.styledInputLabel, { color: colors.mutedForeground }]}>
            {label}
        </Text>
        <TextInput
            style={[
                styles.styledInput,
                multiline && styles.styledInputMultiline,
                {
                    color: colors.foreground,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                },
            ]}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.muted}
            multiline={multiline}
            maxLength={maxLength}
            keyboardType={keyboardType}
            textAlignVertical={multiline ? 'top' : 'center'}
        />
        {maxLength && (
            <Text style={[styles.charCount, { color: colors.muted }]}>
                {(value?.length || 0)}/{maxLength}
            </Text>
        )}
    </View>
);

// Selector Row Component
const SelectorRow = ({
    label,
    value,
    displayValue,
    onPress,
    colors,
    isDark,
}: {
    label: string;
    value: any;
    displayValue: string;
    onPress: () => void;
    colors: any;
    isDark: boolean;
}) => (
    <TouchableOpacity
        style={[
            styles.selectorRow,
            {
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
            },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <Text style={[styles.selectorLabel, { color: colors.foreground }]}>{label}</Text>
        <View style={styles.selectorValue}>
            <Text
                style={[
                    styles.selectorValueText,
                    { color: value ? colors.primary : colors.muted },
                ]}
            >
                {displayValue}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </View>
    </TouchableOpacity>
);

export default function EditProfileScreen() {
    const { colors, isDark } = useTheme();
    const { data: profile, updateProfile, isUpdating, isLoading } = useProfile();
    const { uploadImage, isUploading: isImageUploading } = useImageUpload();
    const router = useRouter();

    const [formData, setFormData] = useState<Partial<Profile>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [activeField, setActiveField] = useState<string | null>(null);
    const [newInterest, setNewInterest] = useState('');

    // Animation for save button
    const saveButtonScale = useSharedValue(1);
    const saveButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: saveButtonScale.value }],
    }));

    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile]);

    useEffect(() => {
        if (isDirty) {
            saveButtonScale.value = withSpring(1.05, {}, () => {
                saveButtonScale.value = withSpring(1);
            });
        }
    }, [isDirty, saveButtonScale]);

    const handleChange = useCallback((field: keyof Profile, value: any) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        setIsDirty(true);
    }, []);

    const handleSave = async () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            let updatedFormData = { ...formData };

            // Upload main photo if changed (local URI)
            if (updatedFormData.profilePhoto && !updatedFormData.profilePhoto.startsWith('http')) {
                const publicUrl = await uploadImage(updatedFormData.profilePhoto);
                updatedFormData.profilePhoto = publicUrl;
            }

            // Upload extra photos
            if (updatedFormData.photos && updatedFormData.photos.length > 0) {
                const uploadedPhotos = await Promise.all(
                    updatedFormData.photos.map(async (photo) => {
                        if (photo && !photo.startsWith('http')) {
                            return await uploadImage(photo);
                        }
                        return photo;
                    })
                );
                updatedFormData.photos = uploadedPhotos;
            }

            updateProfile(updatedFormData, {
                onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    setIsDirty(false);
                    router.back();
                },
                onError: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    Alert.alert('Error', 'Failed to update profile.');
                },
            });
        } catch (error) {
            console.error('Error saving profile:', error);
            Alert.alert('Error', 'Failed to save changes');
        }
    };

    const addInterest = () => {
        if (!newInterest.trim()) return;
        const currentInterests = formData.interests || [];
        if (!currentInterests.includes(newInterest.trim())) {
            handleChange('interests', [...currentInterests, newInterest.trim()]);
        }
        setNewInterest('');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const removeInterest = (interest: string) => {
        const currentInterests = formData.interests || [];
        handleChange('interests', currentInterests.filter((i) => i !== interest));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const toggleQuality = (quality: string) => {
        const current = formData.qualities || [];
        if (current.includes(quality)) {
            handleChange('qualities', current.filter((q) => q !== quality));
        } else if (current.length < 5) {
            handleChange('qualities', [...current, quality]);
        }
    };

    const toggleLanguage = (lang: string) => {
        const current = formData.languages || [];
        if (current.includes(lang)) {
            handleChange('languages', current.filter((l) => l !== lang));
        } else {
            handleChange('languages', [...current, lang]);
        }
    };

    const getOptionsForField = (field: string) => {
        switch (field) {
            case 'gender': return GENDER_OPTIONS;
            case 'lookingFor': return LOOKING_FOR_OPTIONS;
            case 'interestedIn': return INTERESTED_IN_OPTIONS;
            case 'zodiacSign': return ZODIAC_SIGNS;
            case 'personalityType': return PERSONALITY_TYPES;
            case 'loveLanguage': return LOVE_LANGUAGES;
            case 'sleepingHabits': return SLEEPING_HABITS;
            case 'drinkingPreference': return DRINKING_PREFERENCES;
            case 'workoutFrequency': return WORKOUT_FREQUENCY;
            case 'socialMediaUsage': return SOCIAL_MEDIA_USAGE;
            case 'communicationStyle': return COMMUNICATION_STYLE;
            case 'height': return HEIGHT_OPTIONS;
            case 'education': return EDUCATION_OPTIONS;
            case 'smoking': return SMOKING_OPTIONS;
            case 'politics': return POLITICS_OPTIONS;
            case 'religion': return RELIGION_OPTIONS;
            default: return [];
        }
    };

    const getLabelForField = (field: string) => {
        const labels: Record<string, string> = {
            gender: 'Gender',
            lookingFor: 'Looking For',
            interestedIn: 'Show Me',
            zodiacSign: 'Zodiac Sign',
            personalityType: 'Personality Type',
            loveLanguage: 'Love Language',
            sleepingHabits: 'Sleeping Habits',
            drinkingPreference: 'Drinking',
            workoutFrequency: 'Workout',
            socialMediaUsage: 'Social Media',
            communicationStyle: 'Communication',
            height: 'Height',
            education: 'Education',
            smoking: 'Smoking',
            politics: 'Politics',
            religion: 'Religion',
        };
        return labels[field] || field;
    };

    const calculateCompletion = () => {
        let score = 0;
        const max = 100;
        if (formData.profilePhoto) score += 15;
        if ((formData.photos?.length || 0) >= 2) score += 10;
        if (formData.firstName && formData.lastName) score += 10;
        if (formData.bio && formData.bio.length > 20) score += 10;
        if (formData.age) score += 5;
        if (formData.gender) score += 5;
        if (formData.lookingFor) score += 5;
        if (formData.university) score += 5;
        if ((formData.interests?.length || 0) >= 3) score += 10;
        if ((formData.qualities?.length || 0) >= 3) score += 10;
        if ((formData.prompts?.filter((p) => p.response).length || 0) >= 1) score += 10;
        if (formData.aboutMe) score += 5;
        return Math.min(score, max);
    };

    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <View style={{ width: 70 }} />
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                        Edit Profile
                    </Text>
                    <View style={{ width: 70 }} />
                </View>
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    <Skeleton width="100%" height={80} borderRadius={12} style={{ marginBottom: 16 }} />
                    <Skeleton width="100%" height={200} borderRadius={12} style={{ marginBottom: 16 }} />
                    <Skeleton width="100%" height={150} borderRadius={12} />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View
                style={[
                    styles.header,
                    {
                        backgroundColor: isDark ? colors.background : '#ffffff',
                        borderBottomColor: colors.border,
                    },
                ]}
            >
                <TouchableOpacity
                    onPress={() => router.back()}
                    style={styles.headerBackButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <CaretLeft size={24} color={colors.foreground} weight="bold" />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                    Edit Profile
                </Text>
                <Animated.View style={saveButtonStyle}>
                    <TouchableOpacity
                        onPress={handleSave}
                        disabled={!isDirty || isUpdating || isImageUploading}
                        style={[
                            styles.saveButton,
                            {
                                backgroundColor: isDirty ? colors.primary : 'transparent',
                                opacity: isUpdating || isImageUploading ? 0.6 : 1,
                            },
                        ]}
                    >
                        {isImageUploading || isUpdating ? (
                            <Text style={[styles.saveButtonText, { color: colors.muted }]}>
                                Saving...
                            </Text>
                        ) : (
                            <>
                                <Check size={18} color={isDirty ? '#fff' : colors.muted} weight="bold" />
                                <Text
                                    style={[
                                        styles.saveButtonText,
                                        { color: isDirty ? '#fff' : colors.muted },
                                    ]}
                                >
                                    Save
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Profile Completion */}
                    <Animated.View entering={FadeIn.delay(100)} style={styles.meterWrapper}>
                        <StrengthMeter percentage={calculateCompletion()} />
                    </Animated.View>

                    {/* Photos Section */}
                    <Animated.View entering={FadeInDown.delay(150)}>
                        <PhotosEditor
                            profilePhoto={formData.profilePhoto}
                            photos={formData.photos}
                            onUpdateProfilePhoto={(uri) => handleChange('profilePhoto', uri)}
                            onUpdatePhotos={(photos) => handleChange('photos', photos)}
                        />
                    </Animated.View>

                    {/* Basic Info */}
                    <SectionCard
                        title="The Basics"
                        subtitle="Let people know who you are"
                        icon={<User />}
                        delay={200}
                    >
                        <View style={styles.inputsGrid}>
                            <View style={styles.inputHalf}>
                                <StyledInput
                                    label="First Name"
                                    value={formData.firstName}
                                    onChangeText={(text) => handleChange('firstName', text)}
                                    placeholder="Your first name"
                                    colors={colors}
                                    isDark={isDark}
                                />
                            </View>
                            <View style={styles.inputHalf}>
                                <StyledInput
                                    label="Last Name"
                                    value={formData.lastName}
                                    onChangeText={(text) => handleChange('lastName', text)}
                                    placeholder="Your last name"
                                    colors={colors}
                                    isDark={isDark}
                                />
                            </View>
                        </View>
                        <StyledInput
                            label="Bio"
                            value={formData.bio}
                            onChangeText={(text) => handleChange('bio', text)}
                            placeholder="Write something catchy about yourself..."
                            multiline
                            maxLength={200}
                            colors={colors}
                            isDark={isDark}
                        />
                        <View style={styles.inputsGrid}>
                            <View style={styles.inputHalf}>
                                <StyledInput
                                    label="Age"
                                    value={formData.age?.toString()}
                                    onChangeText={(text) => handleChange('age', parseInt(text) || 0)}
                                    placeholder="Your age"
                                    keyboardType="numeric"
                                    colors={colors}
                                    isDark={isDark}
                                />
                            </View>
                            <View style={styles.inputHalf}>
                                <SelectorRow
                                    label="Gender"
                                    value={formData.gender}
                                    displayValue={
                                        GENDER_OPTIONS.find((o) => o.value === formData.gender)?.label ||
                                        'Select'
                                    }
                                    onPress={() => setActiveField('gender')}
                                    colors={colors}
                                    isDark={isDark}
                                />
                            </View>
                        </View>
                    </SectionCard>

                    {/* Dating Preferences */}
                    <SectionCard
                        title="What I'm Looking For"
                        subtitle="Help us find your perfect match"
                        icon={<Heart />}
                        delay={250}
                    >
                        <SelectorRow
                            label="Looking For"
                            value={formData.lookingFor}
                            displayValue={
                                LOOKING_FOR_OPTIONS.find((o) => o.value === formData.lookingFor)
                                    ?.label || 'Select'
                            }
                            onPress={() => setActiveField('lookingFor')}
                            colors={colors}
                            isDark={isDark}
                        />
                        <View style={{ height: 8 }} />
                        <SelectorRow
                            label="Show Me"
                            value={formData.interestedIn?.length}
                            displayValue={
                                formData.interestedIn?.length
                                    ? formData.interestedIn
                                          .map(
                                              (v) =>
                                                  INTERESTED_IN_OPTIONS.find((o) => o.value === v)
                                                      ?.label || v
                                          )
                                          .join(', ')
                                    : 'Select'
                            }
                            onPress={() => setActiveField('interestedIn')}
                            colors={colors}
                            isDark={isDark}
                        />
                    </SectionCard>

                    {/* Education */}
                    <SectionCard
                        title="Education"
                        subtitle="Your academic journey"
                        icon={<GraduationCap />}
                        delay={300}
                    >
                        <StyledInput
                            label="University"
                            value={formData.university}
                            onChangeText={(text) => handleChange('university', text)}
                            placeholder="Where do you study?"
                            colors={colors}
                            isDark={isDark}
                        />
                        <View style={styles.inputsGrid}>
                            <View style={styles.inputHalf}>
                                <StyledInput
                                    label="Course"
                                    value={formData.course}
                                    onChangeText={(text) => handleChange('course', text)}
                                    placeholder="Your major"
                                    colors={colors}
                                    isDark={isDark}
                                />
                            </View>
                            <View style={styles.inputHalf}>
                                <StyledInput
                                    label="Year"
                                    value={formData.yearOfStudy?.toString()}
                                    onChangeText={(text) =>
                                        handleChange('yearOfStudy', parseInt(text) || 0)
                                    }
                                    placeholder="1-5"
                                    keyboardType="numeric"
                                    colors={colors}
                                    isDark={isDark}
                                />
                            </View>
                        </View>
                    </SectionCard>

                    {/* Personality */}
                    <SectionCard
                        title="My Vibe"
                        subtitle="Show off your personality"
                        icon={<Sparkle />}
                        delay={350}
                    >
                        <View style={styles.selectorGrid}>
                            <SelectorRow
                                label="Zodiac"
                                value={formData.zodiacSign}
                                displayValue={formData.zodiacSign || 'Select'}
                                onPress={() => setActiveField('zodiacSign')}
                                colors={colors}
                                isDark={isDark}
                            />
                            <SelectorRow
                                label="Personality"
                                value={formData.personalityType}
                                displayValue={formData.personalityType || 'Select'}
                                onPress={() => setActiveField('personalityType')}
                                colors={colors}
                                isDark={isDark}
                            />
                            <SelectorRow
                                label="Love Language"
                                value={formData.loveLanguage}
                                displayValue={formData.loveLanguage || 'Select'}
                                onPress={() => setActiveField('loveLanguage')}
                                colors={colors}
                                isDark={isDark}
                            />
                        </View>
                    </SectionCard>

                    {/* Qualities */}
                    <SectionCard
                        title="My Qualities"
                        subtitle="Select up to 5 that describe you"
                        icon={<Sparkle />}
                        delay={400}
                    >
                        <ChipSelector
                            options={QUALITIES_OPTIONS}
                            selected={formData.qualities || []}
                            onSelect={toggleQuality}
                            multiSelect
                            columns={3}
                        />
                    </SectionCard>

                    {/* Interests */}
                    <SectionCard
                        title="Interests"
                        subtitle="What do you enjoy?"
                        icon={<Heart />}
                        delay={450}
                    >
                        <View style={styles.interestTags}>
                            {formData.interests?.map((interest, index) => (
                                <TouchableOpacity
                                    key={index}
                                    onPress={() => removeInterest(interest)}
                                    style={[
                                        styles.interestTag,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(236, 72, 153, 0.2)'
                                                : 'rgba(236, 72, 153, 0.1)',
                                            borderColor: colors.primary,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.interestTagText, { color: colors.primary }]}>
                                        {interest}
                                    </Text>
                                    <Ionicons name="close" size={14} color={colors.primary} />
                                </TouchableOpacity>
                            ))}
                        </View>
                        <View style={styles.addInterestRow}>
                            <TextInput
                                style={[
                                    styles.addInterestInput,
                                    {
                                        color: colors.foreground,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.04)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={newInterest}
                                onChangeText={setNewInterest}
                                placeholder="Add an interest..."
                                placeholderTextColor={colors.muted}
                                onSubmitEditing={addInterest}
                                returnKeyType="done"
                            />
                            <TouchableOpacity
                                onPress={addInterest}
                                style={[styles.addInterestButton, { backgroundColor: colors.primary }]}
                            >
                                <Ionicons name="add" size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>
                    </SectionCard>

                    {/* Prompts */}
                    <SectionCard
                        title="Prompts"
                        subtitle="Show your personality"
                        icon={<ChatCircle />}
                        delay={500}
                    >
                        {PROMPT_OPTIONS.slice(0, 3).map((prompt, index) => {
                            const currentPrompt = formData.prompts?.find(
                                (p) => p.promptId === prompt.id
                            );
                            return (
                                <View key={prompt.id} style={styles.promptContainer}>
                                    <Text
                                        style={[styles.promptLabel, { color: colors.primary }]}
                                    >
                                        {prompt.label}
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.promptInput,
                                            {
                                                color: colors.foreground,
                                                backgroundColor: isDark
                                                    ? 'rgba(255,255,255,0.06)'
                                                    : 'rgba(0,0,0,0.04)',
                                                borderColor: isDark
                                                    ? 'rgba(255,255,255,0.1)'
                                                    : 'rgba(0,0,0,0.08)',
                                            },
                                        ]}
                                        value={currentPrompt?.response || ''}
                                        onChangeText={(text) => {
                                            const newPrompts = [...(formData.prompts || [])];
                                            const existingIndex = newPrompts.findIndex(
                                                (p) => p.promptId === prompt.id
                                            );
                                            if (existingIndex >= 0) {
                                                newPrompts[existingIndex] = {
                                                    promptId: prompt.id,
                                                    response: text,
                                                };
                                            } else {
                                                newPrompts.push({
                                                    promptId: prompt.id,
                                                    response: text,
                                                });
                                            }
                                            handleChange('prompts', newPrompts);
                                        }}
                                        placeholder="Write your response..."
                                        placeholderTextColor={colors.muted}
                                        multiline
                                        maxLength={150}
                                    />
                                    <Text style={[styles.charCount, { color: colors.muted }]}>
                                        {currentPrompt?.response?.length || 0}/150
                                    </Text>
                                </View>
                            );
                        })}
                    </SectionCard>

                    {/* Lifestyle */}
                    <SectionCard
                        title="Lifestyle"
                        subtitle="Your daily habits"
                        icon={<Barbell />}
                        delay={550}
                    >
                        <View style={styles.selectorGrid}>
                            {[
                                { label: 'Sleeping', field: 'sleepingHabits' },
                                { label: 'Drinking', field: 'drinkingPreference' },
                                { label: 'Workout', field: 'workoutFrequency' },
                                { label: 'Social Media', field: 'socialMediaUsage' },
                            ].map((item) => (
                                <SelectorRow
                                    key={item.field}
                                    label={item.label}
                                    value={formData[item.field as keyof Profile]}
                                    displayValue={
                                        (formData[item.field as keyof Profile] as string) || 'Select'
                                    }
                                    onPress={() => setActiveField(item.field)}
                                    colors={colors}
                                    isDark={isDark}
                                />
                            ))}
                        </View>
                    </SectionCard>

                    {/* About Me */}
                    <SectionCard
                        title="More Details"
                        subtitle="Help people get to know you better"
                        icon={<User />}
                        delay={600}
                    >
                        <View style={styles.selectorGrid}>
                            {[
                                { label: 'Height', field: 'height' },
                                { label: 'Education', field: 'education' },
                                { label: 'Smoking', field: 'smoking' },
                                { label: 'Politics', field: 'politics' },
                                { label: 'Religion', field: 'religion' },
                            ].map((item) => (
                                <SelectorRow
                                    key={item.field}
                                    label={item.label}
                                    value={formData[item.field as keyof Profile]}
                                    displayValue={
                                        (formData[item.field as keyof Profile] as string) || 'Select'
                                    }
                                    onPress={() => setActiveField(item.field)}
                                    colors={colors}
                                    isDark={isDark}
                                />
                            ))}
                        </View>
                    </SectionCard>

                    {/* Languages */}
                    <SectionCard
                        title="Languages"
                        subtitle="Languages you speak"
                        icon={<Globe />}
                        delay={650}
                    >
                        <ChipSelector
                            options={LANGUAGE_OPTIONS.map((l) => ({ value: l, label: l }))}
                            selected={formData.languages || []}
                            onSelect={toggleLanguage}
                            multiSelect
                            columns={3}
                        />
                    </SectionCard>

                    {/* Socials */}
                    <SectionCard
                        title="Socials"
                        subtitle="Connect your social accounts"
                        icon={<InstagramLogo />}
                        delay={700}
                    >
                        <View style={styles.socialRow}>
                            <View
                                style={[
                                    styles.socialIcon,
                                    { backgroundColor: 'rgba(225, 48, 108, 0.15)' },
                                ]}
                            >
                                <InstagramLogo size={20} color="#E1306C" weight="fill" />
                            </View>
                            <TextInput
                                style={[
                                    styles.socialInput,
                                    {
                                        color: colors.foreground,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.04)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={formData.instagram}
                                onChangeText={(text) => handleChange('instagram', text)}
                                placeholder="Instagram username"
                                placeholderTextColor={colors.muted}
                            />
                        </View>
                        <View style={styles.socialRow}>
                            <View
                                style={[
                                    styles.socialIcon,
                                    { backgroundColor: 'rgba(29, 185, 84, 0.15)' },
                                ]}
                            >
                                <SpotifyLogo size={20} color="#1DB954" weight="fill" />
                            </View>
                            <TextInput
                                style={[
                                    styles.socialInput,
                                    {
                                        color: colors.foreground,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.04)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={formData.spotify}
                                onChangeText={(text) => handleChange('spotify', text)}
                                placeholder="Spotify username"
                                placeholderTextColor={colors.muted}
                            />
                        </View>
                        <View style={styles.socialRow}>
                            <View
                                style={[
                                    styles.socialIcon,
                                    { backgroundColor: 'rgba(255, 252, 0, 0.15)' },
                                ]}
                            >
                                <Ionicons name="logo-snapchat" size={20} color="#FFFC00" />
                            </View>
                            <TextInput
                                style={[
                                    styles.socialInput,
                                    {
                                        color: colors.foreground,
                                        backgroundColor: isDark
                                            ? 'rgba(255,255,255,0.06)'
                                            : 'rgba(0,0,0,0.04)',
                                        borderColor: isDark
                                            ? 'rgba(255,255,255,0.1)'
                                            : 'rgba(0,0,0,0.08)',
                                    },
                                ]}
                                value={formData.snapchat}
                                onChangeText={(text) => handleChange('snapchat', text)}
                                placeholder="Snapchat username"
                                placeholderTextColor={colors.muted}
                            />
                        </View>
                    </SectionCard>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            {/* Selection Sheet */}
            <SelectionSheet
                visible={!!activeField}
                onClose={() => setActiveField(null)}
                title={activeField ? getLabelForField(activeField) : ''}
                options={activeField ? getOptionsForField(activeField) : []}
                value={
                    activeField && activeField !== 'interestedIn'
                        ? (formData[activeField as keyof Profile] as string)
                        : undefined
                }
                multiValue={activeField === 'interestedIn' ? formData.interestedIn || [] : undefined}
                onSelect={(value) => activeField && handleChange(activeField as keyof Profile, value)}
                onMultiSelect={(values) =>
                    activeField === 'interestedIn' && handleChange('interestedIn', values)
                }
                multiSelect={activeField === 'interestedIn'}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 12,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerBackButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 4,
    },
    saveButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
    },
    meterWrapper: {
        marginBottom: 20,
        borderRadius: 12,
        overflow: 'hidden',
    },

    // Styled Inputs
    styledInputContainer: {
        marginBottom: 12,
    },
    styledInputLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    styledInput: {
        fontSize: 16,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    styledInputMultiline: {
        minHeight: 80,
        paddingTop: 12,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        textAlign: 'right',
        marginTop: 4,
    },
    inputsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    inputHalf: {
        flex: 1,
    },

    // Selector Rows
    selectorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 8,
    },
    selectorLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
    selectorValue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    selectorValueText: {
        fontSize: 14,
    },
    selectorGrid: {
        gap: 0,
    },

    // Interests
    interestTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    interestTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        gap: 6,
    },
    interestTagText: {
        fontSize: 14,
        fontWeight: '600',
    },
    addInterestRow: {
        flexDirection: 'row',
        gap: 10,
    },
    addInterestInput: {
        flex: 1,
        fontSize: 15,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    addInterestButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Prompts
    promptContainer: {
        marginBottom: 16,
    },
    promptLabel: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    promptInput: {
        fontSize: 15,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        minHeight: 70,
        textAlignVertical: 'top',
    },

    // Socials
    socialRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    socialIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialInput: {
        flex: 1,
        fontSize: 15,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
});
