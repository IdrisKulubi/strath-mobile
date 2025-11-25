import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, ScrollView } from 'react-native';
import { PhaseProps } from './types';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';
import * as ImagePicker from 'expo-image-picker';

const LOOKING_FOR_OPTIONS = [
    { id: 'friendship', label: 'Friendship', emoji: '🤝' },
    { id: 'dating', label: 'Dating', emoji: '💘' },
    { id: 'relationship', label: 'Relationship', emoji: '💑' },
    { id: 'networking', label: 'Networking', emoji: '🌐' },
    { id: 'fun', label: 'Just Fun', emoji: '🎉' },
];

export default function Phase2ProfileEssentials({ data, updateData, onNext, onBack }: PhaseProps) {
    const [bioLength, setBioLength] = useState(data.bio.length);

    const handleBioChange = (text: string) => {
        if (text.length <= 500) {
            updateData('bio', text);
            setBioLength(text.length);
        }
    };

    const handleLookingForToggle = (option: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateData('lookingFor', option);
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
            selectionLimit: 6,
        });

        if (!result.canceled) {
            const newPhotos = result.assets.map(asset => asset.uri);
            updateData('photos', [...data.photos, ...newPhotos].slice(0, 6));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
    };

    const handleRemovePhoto = (index: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newPhotos = data.photos.filter((_, i) => i !== index);
        updateData('photos', newPhotos);
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (data.bio && data.lookingFor && data.photos.length > 0) {
            onNext();
        } else {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
                <Text style={styles.title}>Profile Essentials</Text>
                <Text style={styles.subtitle}>Tell your story, set your vibe.</Text>
            </Animated.View>

            {/* Bio Section */}
            <Animated.View entering={SlideInDown.delay(100).duration(600)} style={styles.section}>
                <Text style={styles.label}>About You</Text>
                <View style={styles.bioContainer}>
                    <TextInput
                        style={styles.bioInput}
                        placeholder="Write something interesting about yourself..."
                        placeholderTextColor="#666"
                        value={data.bio}
                        onChangeText={handleBioChange}
                        multiline
                        maxLength={500}
                        numberOfLines={6}
                    />
                    <Text style={styles.charCount}>{bioLength}/500</Text>
                </View>
            </Animated.View>

            {/* Looking For Section */}
            <Animated.View entering={SlideInDown.delay(200).duration(600)} style={styles.section}>
                <Text style={styles.label}>I'm Looking For</Text>
                <View style={styles.chipContainer}>
                    {LOOKING_FOR_OPTIONS.map((option) => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.chip,
                                data.lookingFor === option.id && styles.chipActive
                            ]}
                            onPress={() => handleLookingForToggle(option.id)}
                        >
                            <Text style={styles.chipEmoji}>{option.emoji}</Text>
                            <Text style={[
                                styles.chipText,
                                data.lookingFor === option.id && styles.chipTextActive
                            ]}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </Animated.View>

            {/* Photos Section */}
            <Animated.View entering={SlideInDown.delay(300).duration(600)} style={styles.section}>
                <Text style={styles.label}>Add Photos ({data.photos.length}/6)</Text>
                <TouchableOpacity style={styles.addPhotoButton} onPress={handlePickImage}>
                    <LinearGradient
                        colors={[Colors.dark.primary, Colors.dark.accent]}
                        style={styles.addPhotoGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.addPhotoText}>+ Add Photos</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {data.photos.length > 0 && (
                    <View style={styles.photoGrid}>
                        {data.photos.map((photo, index) => (
                            <View key={index} style={styles.photoItem}>
                                <View style={styles.photoPlaceholder}>
                                    <Text style={styles.photoNumber}>{index + 1}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => handleRemovePhoto(index)}
                                >
                                    <Text style={styles.removeButtonText}>×</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}
            </Animated.View>

            {/* Navigation Buttons */}
            <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                    <Text style={styles.nextButtonText}>NEXT →</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    header: {
        marginBottom: 30,
        marginTop: 20,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
    },
    section: {
        marginBottom: 32,
    },
    label: {
        fontSize: 16,
        color: Colors.dark.primary,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    bioContainer: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 16,
        padding: 16,
    },
    bioInput: {
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
    },
    charCount: {
        color: '#666',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 8,
    },
    chipContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chipActive: {
        backgroundColor: Colors.dark.primary + '20',
        borderColor: Colors.dark.primary,
        borderWidth: 2,
    },
    chipEmoji: {
        fontSize: 18,
    },
    chipText: {
        color: '#888',
        fontSize: 14,
        fontWeight: '500',
    },
    chipTextActive: {
        color: Colors.dark.primary,
        fontWeight: '700',
    },
    addPhotoButton: {
        marginBottom: 16,
    },
    addPhotoGradient: {
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    addPhotoText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    photoItem: {
        width: '30%',
        aspectRatio: 0.75,
        position: 'relative',
    },
    photoPlaceholder: {
        width: '100%',
        height: '100%',
        backgroundColor: '#222',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.dark.primary + '40',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoNumber: {
        color: Colors.dark.primary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    removeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: Colors.dark.destructive,
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    removeButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
        lineHeight: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
        marginBottom: 40,
    },
    backButton: {
        flex: 1,
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    nextButton: {
        flex: 1,
        backgroundColor: Colors.dark.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    nextButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
