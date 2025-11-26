import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image, Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { useProfile, Profile } from '@/hooks/use-profile';
import { StrengthMeter } from '@/components/profile/strength-meter';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { useImageUpload } from '@/hooks/use-image-upload';

export default function EditProfileScreen() {
    const { colors } = useTheme();
    const { data: profile, updateProfile, isUpdating } = useProfile();
    const { uploadImage, isUploading: isImageUploading } = useImageUpload();
    const router = useRouter();

    const [formData, setFormData] = useState<Partial<Profile>>({});
    const [isDirty, setIsDirty] = useState(false);
    const [newInterest, setNewInterest] = useState('');

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

    return (
        <View style={[styles.container, { backgroundColor: colors.background }]}>
            {/* Header */}
            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity onPress={() => router.back()}>
                    <Text style={[styles.headerButton, { color: colors.muted }]}>Cancel</Text>
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: colors.foreground }]}>Update DNA</Text>
                <TouchableOpacity onPress={handleSave} disabled={!isDirty || isUpdating || isImageUploading}>
                    <Text style={[styles.headerButton, { color: isDirty ? colors.primary : colors.muted, opacity: isUpdating || isImageUploading ? 0.5 : 1 }]}>
                        {isImageUploading ? 'Uploading...' : 'Save'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Strength Meter */}
            <StrengthMeter percentage={completion} />

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <ScrollView contentContainerStyle={styles.scrollContent}>

                    {/* Photo Lab */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>PHOTO LAB</Text>
                        <View style={styles.photoGrid}>
                            {/* Main Photo */}
                            <TouchableOpacity style={styles.mainPhotoContainer} onPress={() => handleImagePress(-1)}>
                                {formData.profilePhoto ? (
                                    <Image source={{ uri: formData.profilePhoto }} style={styles.mainPhoto} />
                                ) : (
                                    <View style={[styles.placeholderPhoto, { backgroundColor: colors.card }]}>
                                        <Ionicons name="add" size={40} color={colors.primary} />
                                    </View>
                                )}
                                <View style={styles.photoBadge}>
                                    <Text style={styles.photoBadgeText}>MAIN</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Extra Photos */}
                            {[1, 2, 3, 4, 5].map((i) => {
                                const photoUri = formData.photos?.[i - 1];
                                return (
                                    <TouchableOpacity key={i} style={styles.smallPhotoContainer} onPress={() => handleImagePress(i - 1)}>
                                        {photoUri ? (
                                            <Image source={{ uri: photoUri }} style={styles.smallPhoto} />
                                        ) : (
                                            <View style={[styles.placeholderPhoto, { backgroundColor: colors.card }]}>
                                                <Ionicons name="add" size={24} color={colors.primary} />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                        <Text style={[styles.helperText, { color: colors.muted }]}>
                            Drag to reorder. Tap to edit.
                        </Text>
                    </View>

                    {/* The Basics */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>THE BASICS</Text>
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>First Name</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.firstName}
                                    onChangeText={(text) => handleChange('firstName', text)}
                                    placeholder="First Name"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Last Name</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.lastName}
                                    onChangeText={(text) => handleChange('lastName', text)}
                                    placeholder="Last Name"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Bio</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground, height: 80 }]}
                                    value={formData.bio}
                                    onChangeText={(text) => handleChange('bio', text)}
                                    placeholder="Tell us about yourself..."
                                    placeholderTextColor={colors.muted}
                                    multiline
                                />
                            </View>
                        </View>
                    </View>

                    {/* Personal Details */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>PERSONAL DETAILS</Text>
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Age</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.age?.toString()}
                                    onChangeText={(text) => handleChange('age', parseInt(text) || 0)}
                                    placeholder="Age"
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Gender</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.gender}
                                    onChangeText={(text) => handleChange('gender', text)}
                                    placeholder="Gender"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Looking For</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.lookingFor}
                                    onChangeText={(text) => handleChange('lookingFor', text)}
                                    placeholder="e.g. Friendship, Networking"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Uni Life */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>UNI LIFE</Text>
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>University</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.university}
                                    onChangeText={(text) => handleChange('university', text)}
                                    placeholder="University"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Course</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.course}
                                    onChangeText={(text) => handleChange('course', text)}
                                    placeholder="Course"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Year</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.yearOfStudy?.toString()}
                                    onChangeText={(text) => handleChange('yearOfStudy', parseInt(text) || 0)}
                                    placeholder="Year"
                                    keyboardType="numeric"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                        </View>
                    </View>

                    {/* The Vibe */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>THE VIBE</Text>
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Zodiac</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.zodiacSign}
                                    onChangeText={(text) => handleChange('zodiacSign', text)}
                                    placeholder="Select Zodiac"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Personality</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.personalityType}
                                    onChangeText={(text) => handleChange('personalityType', text)}
                                    placeholder="MBTI / Enneagram"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Love Language</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.loveLanguage}
                                    onChangeText={(text) => handleChange('loveLanguage', text)}
                                    placeholder="Select Love Language"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Interests */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>INTERESTS</Text>
                        <View style={[styles.inputGroup, { backgroundColor: colors.card, padding: 16 }]}>
                            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground, backgroundColor: colors.background, borderRadius: 8, paddingHorizontal: 12, marginRight: 8 }]}
                                    value={newInterest}
                                    onChangeText={setNewInterest}
                                    placeholder="Add an interest..."
                                    placeholderTextColor={colors.muted}
                                    onSubmitEditing={addInterest}
                                />
                                <TouchableOpacity onPress={addInterest} style={{ justifyContent: 'center', paddingHorizontal: 12, backgroundColor: colors.primary, borderRadius: 8 }}>
                                    <Ionicons name="add" size={24} color="white" />
                                </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                                {formData.interests?.map((interest, index) => (
                                    <TouchableOpacity key={index} onPress={() => removeInterest(interest)} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
                                        <Text style={{ color: colors.foreground, marginRight: 4 }}>{interest}</Text>
                                        <Ionicons name="close-circle" size={16} color={colors.muted} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* Lifestyle */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>LIFESTYLE</Text>
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Sleeping</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.sleepingHabits}
                                    onChangeText={(text) => handleChange('sleepingHabits', text)}
                                    placeholder="e.g. Night Owl"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Drinking</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.drinkingPreference}
                                    onChangeText={(text) => handleChange('drinkingPreference', text)}
                                    placeholder="e.g. Socially"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Workout</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.workoutFrequency}
                                    onChangeText={(text) => handleChange('workoutFrequency', text)}
                                    placeholder="e.g. Often"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Social Media</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.socialMediaUsage}
                                    onChangeText={(text) => handleChange('socialMediaUsage', text)}
                                    placeholder="e.g. Active"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Text style={[styles.label, { color: colors.foreground }]}>Communication</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.communicationStyle}
                                    onChangeText={(text) => handleChange('communicationStyle', text)}
                                    placeholder="e.g. Texting"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                        </View>
                    </View>

                    {/* Socials */}
                    <View style={styles.section}>
                        <Text style={[styles.sectionTitle, { color: colors.muted }]}>SOCIALS</Text>
                        <View style={[styles.inputGroup, { backgroundColor: colors.card }]}>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Ionicons name="logo-instagram" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.instagram}
                                    onChangeText={(text) => handleChange('instagram', text)}
                                    placeholder="Instagram Handle"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={[styles.inputRow, { borderBottomColor: colors.border }]}>
                                <Ionicons name="musical-notes" size={20} color={colors.primary} style={styles.inputIcon} />
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    value={formData.spotify}
                                    onChangeText={(text) => handleChange('spotify', text)}
                                    placeholder="Spotify Username"
                                    placeholderTextColor={colors.muted}
                                />
                            </View>
                            <View style={styles.inputRow}>
                                <Ionicons name="logo-snapchat" size={20} color={colors.primary} style={styles.inputIcon} />
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



                    <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={isUpdating || isImageUploading}>
                        <Text style={styles.saveButtonText}>{isUpdating || isImageUploading ? 'Saving...' : 'Save Changes'}</Text>
                    </TouchableOpacity>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    headerButton: {
        fontSize: 16,
        fontWeight: '600',
    },
    scrollContent: {
        padding: 16,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 12,
        letterSpacing: 1,
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    mainPhotoContainer: {
        width: '64%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    mainPhoto: {
        width: '100%',
        height: '100%',
    },
    smallPhotoContainer: {
        width: '30%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
    },
    smallPhoto: {
        width: '100%',
        height: '100%',
    },
    placeholderPhoto: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    photoBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    helperText: {
        fontSize: 12,
        marginTop: 8,
        textAlign: 'center',
    },
    inputGroup: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    label: {
        width: 100,
        fontSize: 16,
        fontWeight: '500',
    },
    input: {
        flex: 1,
        fontSize: 16,
    },
    saveButton: {
        backgroundColor: '#e91e8c', // Pink
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
    inputIcon: {
        marginRight: 12,
    },
});
