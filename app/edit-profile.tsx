import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useProfile, Profile } from '@/hooks/use-profile';
import { StrengthMeter } from '@/components/profile/strength-meter';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useImageUpload } from '@/hooks/use-image-upload';
import { Skeleton } from '@/components/ui/skeleton';
import { SelectionSheet } from '@/components/ui/selection-sheet';
import {
    GENDER_OPTIONS,
    LOOKING_FOR_OPTIONS,
    ZODIAC_SIGNS,
    PERSONALITY_TYPES,
    LOVE_LANGUAGES,
    SLEEPING_HABITS,
    DRINKING_PREFERENCES,
    WORKOUT_FREQUENCY,
    SOCIAL_MEDIA_USAGE,
    COMMUNICATION_STYLE
} from '@/constants/profile-options';

export default function EditProfileScreen() {
    const { colors } = useTheme();
    const { data: profile, updateProfile, isUpdating, isLoading } = useProfile();
    const { uploadImage, isUploading: isImageUploading } = useImageUpload();
    const router = useRouter();

    const [formData, setFormData] = useState<Partial<Profile>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [newInterest, setNewInterest] = useState('');
    const [activeField, setActiveField] = useState<string | null>(null);

    const getOptionsForField = (field: string) => {
        switch (field) {
            case 'gender': return GENDER_OPTIONS;
            case 'lookingFor': return LOOKING_FOR_OPTIONS;
            case 'zodiacSign': return ZODIAC_SIGNS;
            case 'personalityType': return PERSONALITY_TYPES;
            case 'loveLanguage': return LOVE_LANGUAGES;
            case 'sleepingHabits': return SLEEPING_HABITS;
            case 'drinkingPreference': return DRINKING_PREFERENCES;
            case 'workoutFrequency': return WORKOUT_FREQUENCY;
            case 'socialMediaUsage': return SOCIAL_MEDIA_USAGE;
            case 'communicationStyle': return COMMUNICATION_STYLE;
            default: return [];
        }
    };

    const getLabelForField = (field: string) => {
        switch (field) {
            case 'gender': return 'Gender';
            case 'lookingFor': return 'Looking For';
            case 'zodiacSign': return 'Zodiac Sign';
            case 'personalityType': return 'Personality Type';
            case 'loveLanguage': return 'Love Language';
            case 'sleepingHabits': return 'Sleeping Habits';
            case 'drinkingPreference': return 'Drinking Preference';
            case 'workoutFrequency': return 'Workout Frequency';
            case 'socialMediaUsage': return 'Social Media Usage';
            case 'communicationStyle': return 'Communication Style';
            default: return '';
        }
    };

    const addInterest = () => {
        if (!newInterest.trim()) return;
        const currentInterests = formData.interests || [];
        if (!currentInterests.includes(newInterest.trim())) {
            handleChange('interests', [...currentInterests, newInterest.trim()]);
        }
        setNewInterest('');
    };

    const removeInterest = (interest: string) => {
        const currentInterests = formData.interests || [];
        handleChange('interests', currentInterests.filter(i => i !== interest));
    };

    useEffect(() => {
        if (profile) {
            setFormData(profile);
        }
    }, [profile]);

    const handleChange = (field: keyof Profile, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setIsDirty(true);
    };

    const handleImagePress = async (index: number) => {
        // index -1 for main photo, 0-4 for extra photos
        const isMain = index === -1;
        const currentUri = isMain ? formData.profilePhoto : formData.photos?.[index];

        if (currentUri) {
            Alert.alert(
                "Edit Photo",
                "Choose an action",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Remove", style: "destructive", onPress: () => removeImage(index) },
                    { text: "Replace", onPress: () => pickImage(index) }
                ]
            );
        } else {
            pickImage(index);
        }
    };

    const pickImage = async (index: number) => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            const newUri = result.assets[0].uri;
            if (index === -1) {
                handleChange('profilePhoto', newUri);
            } else {
                const currentPhotos = [...(formData.photos || [])];
                // If replacing an existing photo (index within bounds)
                if (index < currentPhotos.length) {
                    currentPhotos[index] = newUri;
                } else {
                    // If adding a new photo (append)
                    currentPhotos.push(newUri);
                }
                handleChange('photos', currentPhotos);
            }
        }
    };

    const removeImage = (index: number) => {
        if (index === -1) {
            handleChange('profilePhoto', null);
        } else {
            const currentPhotos = [...(formData.photos || [])];
            currentPhotos.splice(index, 1);
            handleChange('photos', currentPhotos);
        }
    };

    const handleSave = async () => {
        try {
            let updatedFormData = { ...formData };

            // Upload main photo if changed (local URI)
            if (updatedFormData.profilePhoto && !updatedFormData.profilePhoto.startsWith('http')) {
                const publicUrl = await uploadImage(updatedFormData.profilePhoto);
                updatedFormData.profilePhoto = publicUrl;
                // Update state so preview shows uploaded image
                setFormData(prev => ({ ...prev, profilePhoto: publicUrl }));
            }

            // Upload extra photos
            if (updatedFormData.photos && updatedFormData.photos.length > 0) {
                const uploadedPhotos = await Promise.all(updatedFormData.photos.map(async (photo) => {
                    if (photo && !photo.startsWith('http')) {
                        return await uploadImage(photo);
                    }
                    return photo;
                }));
                updatedFormData.photos = uploadedPhotos;
                // Update state so previews show uploaded images
                setFormData(prev => ({ ...prev, photos: uploadedPhotos }));
            }

            updateProfile(updatedFormData, {
                onSuccess: () => {
                    Alert.alert("Success", "Profile updated successfully!");
                    setIsDirty(false);
                    router.back();
                },
                onError: (error) => {
                    Alert.alert("Error", "Failed to update profile.");
                    console.error(error);
                }
            });
        } catch (error) {
            Alert.alert("Error", "Failed to upload images.");
            console.error(error);
        }
    };

    const calculateCompletion = () => {
        if (!formData) return 0;
        let score = 0;

        // Basic Info (30%)
        if (formData.firstName && formData.lastName) score += 10;
        if (formData.bio) score += 10;
        if (formData.profilePhoto) score += 10;

        // Uni Life (20%)
        if (formData.university) score += 10;
        if (formData.course && formData.yearOfStudy) score += 10;

        // Vibe (30%)
        if (formData.interests && formData.interests.length > 0) score += 10;
        if (formData.zodiacSign) score += 5;
        if (formData.personalityType) score += 5;
        if (formData.loveLanguage) score += 5;
        if (formData.photos && formData.photos.length > 0) score += 5;

        // Socials (20%)
        if (formData.instagram) score += 10;
        if (formData.spotify || formData.snapchat) score += 10;

        return Math.min(score, 100);
    };

    const completion = calculateCompletion();

    const renderSectionHeader = (title: string) => (
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>{title}</Text>
    );

    if (isLoading) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <View style={[styles.header, { borderBottomColor: colors.border }]}>
                    <View style={{ width: 50, height: 20 }} />
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>Update DNA</Text>
                    <View style={{ width: 50, height: 20 }} />
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Photo Lab Skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={100} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
                        <View style={styles.photoSection}>
                            <Skeleton width="64%" height={undefined} style={{ aspectRatio: 1, borderRadius: 12 }} />
                            <Skeleton width="30%" height={undefined} style={{ aspectRatio: 1, borderRadius: 12 }} />
                            <Skeleton width="30%" height={undefined} style={{ aspectRatio: 1, borderRadius: 12 }} />
                            <Skeleton width="30%" height={undefined} style={{ aspectRatio: 1, borderRadius: 12 }} />
                        </View>
                    </View>

                    {/* Basics Skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={100} height={16} borderRadius={4} style={{ marginBottom: 12 }} />
                        <View style={[styles.inputGroup, { backgroundColor: colors.card, padding: 16 }]}>
                            <Skeleton width="100%" height={40} borderRadius={8} style={{ marginBottom: 16 }} />
                            <Skeleton width="100%" height={40} borderRadius={8} style={{ marginBottom: 16 }} />
                            <Skeleton width="100%" height={80} borderRadius={8} />
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.headerButton, { color: colors.primary }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Edit Profile</Text>
                <TouchableOpacity onPress={handleSave} disabled={!isDirty || isUpdating || isImageUploading}>
                    <Text style={[styles.headerButton, { color: isDirty ? colors.primary : colors.muted, opacity: isUpdating || isImageUploading ? 0.5 : 1, fontWeight: 'bold' }]}>
                        {isImageUploading ? 'Uploading...' : 'Done'}
                    </Text>
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                    {/* Strength Meter */}
                    <View style={styles.meterContainer}>
                        <StrengthMeter percentage={completion} />
                    </View>

                    {/* Photo Lab */}
                    {/* Photo Lab */}
                    <View style={styles.section}>
                        {renderSectionHeader("PHOTOS & VIDEOS")}
                        <Text style={[styles.helperText, { color: colors.muted, marginBottom: 16, marginTop: -4 }]}>
                            Pick some that show the true you.
                        </Text>

                        <View style={styles.photoGridContainer}>
                            {/* Main Photo (Slot 1) */}
                            <TouchableOpacity
                                style={[styles.photoCard, styles.gridPhotoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                onPress={() => handleImagePress(-1)}
                                activeOpacity={0.9}
                            >
                                {formData.profilePhoto ? (
                                    <>
                                        <Image source={{ uri: formData.profilePhoto }} style={styles.photoCardImage} />
                                        <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                                            <Ionicons name="pencil" size={16} color="white" />
                                        </View>
                                        <View style={styles.mainPhotoBadge}>
                                            <Text style={styles.mainPhotoBadgeText}>Main</Text>
                                        </View>
                                    </>
                                ) : (
                                    <View style={styles.photoCardEmpty}>
                                        <Ionicons name="add" size={32} color={colors.primary} />
                                        <View style={[styles.photoNumberBadge, { backgroundColor: colors.border, position: 'absolute', bottom: 8, left: 8, width: 24, height: 24 }]}>
                                            <Text style={[styles.photoNumberText, { color: colors.muted, fontSize: 12 }]}>1</Text>
                                        </View>
                                    </View>
                                )}
                            </TouchableOpacity>

                            {/* Additional Photos (Slots 2-6) */}
                            {[0, 1, 2, 3, 4].map((index) => {
                                const photoUri = formData.photos?.[index];
                                const photoNumber = index + 2;
                                return (
                                    <TouchableOpacity
                                        key={index}
                                        style={[styles.photoCard, styles.gridPhotoCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                                        onPress={() => handleImagePress(index)}
                                        activeOpacity={0.9}
                                    >
                                        {photoUri ? (
                                            <>
                                                <Image source={{ uri: photoUri }} style={styles.photoCardImage} />
                                                <View style={[styles.photoOverlay, { backgroundColor: 'rgba(0,0,0,0.3)' }]}>
                                                    <Ionicons name="close-circle" size={20} color="white" style={{ position: 'absolute', top: 4, right: 4 }} />
                                                </View>
                                                <View style={[styles.photoNumberBadge, { backgroundColor: 'rgba(0,0,0,0.5)', position: 'absolute', bottom: 8, left: 8, width: 24, height: 24 }]}>
                                                    <Text style={[styles.photoNumberText, { color: 'white', fontSize: 12 }]}>{photoNumber}</Text>
                                                </View>
                                            </>
                                        ) : (
                                            <View style={styles.photoCardEmpty}>
                                                <Ionicons name="add" size={32} color={colors.border} />
                                                <View style={[styles.photoNumberBadge, { backgroundColor: colors.border, position: 'absolute', bottom: 8, left: 8, width: 24, height: 24 }]}>
                                                    <Text style={[styles.photoNumberText, { color: colors.muted, fontSize: 12 }]}>{photoNumber}</Text>
                                                </View>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* The Basics */}
                    <View style={styles.section}>
                        {renderSectionHeader("THE BASICS")}
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>First Name</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.firstName}
                                    onChangeText={(text) => handleChange('firstName', text)}
                                    placeholder="Required"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Last Name</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.lastName}
                                    onChangeText={(text) => handleChange('lastName', text)}
                                    placeholder="Required"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.foreground, alignSelf: 'flex-start', marginTop: 12 }]}>Bio</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground, height: 100, paddingTop: 12 }]}
                                    value={formData.bio}
                                    onChangeText={(text) => handleChange('bio', text)}
                                    placeholder="Tell us about yourself..."
                                    placeholderTextColor={colors.muted}
                                    multiline
                                    textAlignVertical="top"
                                />
                            </View>
                        </View>
                    </View>

                    {/* Personal Details */}
                    <View style={styles.section}>
                        {renderSectionHeader("DETAILS")}
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Age</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.age?.toString()}
                                    onChangeText={(text) => handleChange('age', parseInt(text) || 0)}
                                    placeholder="Required"
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <TouchableOpacity
                                style={[styles.inputRow, { borderBottomColor: colors.border }]}
                                onPress={() => setActiveField('gender')}
                            >
                                <Text style={[styles.label, { color: colors.foreground }]}>Gender</Text>
                                <View style={styles.selectValueContainer}>
                                    <Text style={[styles.inputText, { color: formData.gender ? colors.primary : colors.muted }]}>
                                        {formData.gender ? (GENDER_OPTIONS.find(o => o.value === formData.gender)?.label || formData.gender) : 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.inputRow}
                                onPress={() => setActiveField('lookingFor')}
                            >
                                <Text style={[styles.label, { color: colors.foreground }]}>Looking For</Text>
                                <View style={styles.selectValueContainer}>
                                    <Text style={[styles.inputText, { color: formData.lookingFor ? colors.primary : colors.muted }]}>
                                        {formData.lookingFor ? (LOOKING_FOR_OPTIONS.find(o => o.value === formData.lookingFor)?.label || formData.lookingFor) : 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Uni Life */}
                    <View style={styles.section}>
                        {renderSectionHeader("EDUCATION")}
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>University</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.university}
                                    onChangeText={(text) => handleChange('university', text)}
                                    placeholder="Add University"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Course</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.course}
                                    onChangeText={(text) => handleChange('course', text)}
                                    placeholder="Add Course"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Year</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.yearOfStudy?.toString()}
                                    onChangeText={(text) => handleChange('yearOfStudy', parseInt(text) || 0)}
                                    placeholder="Add Year"
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                        </View>
                    </View>

                    {/* The Vibe */}
                    <View style={styles.section}>
                        {renderSectionHeader("MY VIBE")}
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <TouchableOpacity
                                style={[styles.inputRow, { borderBottomColor: colors.border }]}
                                onPress={() => setActiveField('zodiacSign')}
                            >
                                <Text style={[styles.label, { color: colors.foreground }]}>Zodiac</Text>
                                <View style={styles.selectValueContainer}>
                                    <Text style={[styles.inputText, { color: formData.zodiacSign ? colors.primary : colors.muted }]}>
                                        {formData.zodiacSign || 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.inputRow, { borderBottomColor: colors.border }]}
                                onPress={() => setActiveField('personalityType')}
                            >
                                <Text style={[styles.label, { color: colors.foreground }]}>Personality</Text>
                                <View style={styles.selectValueContainer}>
                                    <Text style={[styles.inputText, { color: formData.personalityType ? colors.primary : colors.muted }]}>
                                        {formData.personalityType || 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.inputRow}
                                onPress={() => setActiveField('loveLanguage')}
                            >
                                <Text style={[styles.label, { color: colors.foreground }]}>Love Language</Text>
                                <View style={styles.selectValueContainer}>
                                    <Text style={[styles.inputText, { color: formData.loveLanguage ? colors.primary : colors.muted }]}>
                                        {formData.loveLanguage || 'Select'}
                                    </Text>
                                    <Ionicons name="chevron-forward" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
                                </View>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Interests */}
                    <View style={styles.section}>
                        {renderSectionHeader("INTERESTS")}
                        <View style={[styles.inputGroup, { backgroundColor: colors.card, padding: 16 }]}>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                                {formData.interests?.map((interest, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        onPress={() => removeInterest(interest)}
                                        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.primary + '30' }}
                                    >
                                        <Text style={{ color: colors.primary, marginRight: 6, fontWeight: '600' }}>{interest}</Text>
                                        <Ionicons name="close" size={14} color={colors.primary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderRadius: 10, paddingHorizontal: 12, height: 44, marginRight: 10 }]}
                                    value={newInterest}
                                    onChangeText={setNewInterest}
                                    placeholder="Add an interest..."
                                    placeholderTextColor={colors.muted}
                                    onSubmitEditing={addInterest}
                                    returnKeyType="done"
                                />
                                <TouchableOpacity
                                    onPress={addInterest}
                                    style={{ width: 44, height: 44, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: 22 }}
                                >
                                    <Ionicons name="arrow-up" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>

                    {/* Lifestyle */}
                    <View style={styles.section}>
                        {renderSectionHeader("LIFESTYLE")}
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            {[
                                { label: 'Sleeping', field: 'sleepingHabits' },
                                { label: 'Drinking', field: 'drinkingPreference' },
                                { label: 'Workout', field: 'workoutFrequency' },
                                { label: 'Social Media', field: 'socialMediaUsage' },
                                { label: 'Communication', field: 'communicationStyle' },
                            ].map((item, index, arr) => (
                                <TouchableOpacity
                                    key={item.field}
                                    style={[styles.inputRow, index < arr.length - 1 && { borderBottomColor: colors.border }]}
                                    onPress={() => setActiveField(item.field)}
                                >
                                    <Text style={[styles.label, { color: colors.foreground }]}>{item.label}</Text>
                                    <View style={styles.selectValueContainer}>
                                        <Text style={[styles.inputText, { color: formData[item.field as keyof Profile] ? colors.primary : colors.muted }]}>
                                            {formData[item.field as keyof Profile] as string || 'Select'}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={20} color={colors.muted} style={{ marginLeft: 8 }} />
                                    </View>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Socials */}
                    <View style={styles.section}>
                        {renderSectionHeader("SOCIALS")}
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Ionicons name="logo-instagram" size={22} color="#E1306C" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.instagram}
                                    onChangeText={(text) => handleChange('instagram', text)}
                                    placeholder="Instagram Handle"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Ionicons name="musical-notes" size={22} color="#1DB954" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.spotify}
                                    onChangeText={(text) => handleChange('spotify', text)}
                                    placeholder="Spotify Username"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Ionicons name="logo-snapchat" size={22} color="#FFFC00" style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.snapchat}
                                    onChangeText={(text) => handleChange('snapchat', text)}
                                    placeholder="Snapchat Username"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                        </View>
                    </View>

                    <View style={{ height: 100 }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <SelectionSheet
                visible={!!activeField}
                onClose={() => setActiveField(null)}
                title={activeField ? getLabelForField(activeField) : ''}
                options={activeField ? getOptionsForField(activeField) : []}
                value={activeField ? (formData[activeField as keyof Profile] as string) : undefined}
                onSelect={(value) => activeField && handleChange(activeField as keyof Profile, value)}
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
    headerTitle: {
        fontSize: 17,
        fontWeight: '600',
    },
    headerButton: {
        fontSize: 17,
    },
    scrollContent: {
        padding: 20,
    },
    meterContainer: {
        marginBottom: 24,
        borderRadius: 12,
        overflow: 'hidden',
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 16,
        textTransform: 'uppercase',
        letterSpacing: -0.2,
    },
    photoSection: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    photoGridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    photoCard: {
        borderRadius: 12,
        borderWidth: 2,
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#1C1C1E', // Fallback
    },
    gridPhotoCard: {
        width: '31%', // (100% - 16px gap) / 3
        aspectRatio: 1,
    },
    photoCardImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    photoOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoCardEmpty: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainPhotoBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    mainPhotoBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    photoNumberBadge: {
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    photoNumberText: {
        fontWeight: '600',
    },
    helperText: {
        fontSize: 13,
        marginTop: 8,
        marginLeft: 16,
    },
    inputGroup: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
        minHeight: 50,
    },
    label: {
        width: 110,
        fontSize: 17,
        fontWeight: '400',
    },
    input: {
        flex: 1,
        fontSize: 17,
    },
    selectValueContainer: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    inputText: {
        fontSize: 17,
        textAlign: 'right',
    },
    inputIcon: {
        marginRight: 16,
        width: 24,
        textAlign: 'center',
    },
    saveButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 24,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
