import React from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, Platform, ScrollView, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { PhaseProps } from './types';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import { Colors } from '../../constants/theme';

export default function Phase1IDCard({ data, updateData, onNext }: PhaseProps) {
    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (data.firstName && data.lastName && data.university && data.age && data.gender) {
            onNext();
        } else {
            // Shake animation or error feedback could go here
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    };

    const handleGenderSelect = (gender: 'male' | 'female' | 'other') => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        updateData('gender', gender);
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
                        <Text style={styles.title}>Identity Protocol</Text>
                        <Text style={styles.subtitle}>Initialize your digital signature.</Text>
                    </Animated.View>

                    <Animated.View entering={SlideInRight.delay(200).duration(600)} style={styles.cardContainer}>
                        <LinearGradient
                            colors={['#1a1a1a', '#000000']}
                            style={styles.idCard}
                        >
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardLabel}>STUDENT ID</Text>
                                <View style={styles.hologram} />
                            </View>

                            <View style={styles.cardContent}>
                                <View style={styles.photoPlaceholder}>
                                    <Text style={styles.photoText}>NO PHOTO</Text>
                                </View>
                                <View style={styles.details}>
                                    <Text style={styles.monoText}>{data.firstName || 'FIRST_NAME'}</Text>
                                    <Text style={styles.monoText}>{data.lastName || 'LAST_NAME'}</Text>
                                    <Text style={[styles.monoText, styles.highlight]}>{data.university || 'UNIVERSITY'}</Text>
                                    <Text style={styles.monoText}>{data.course || 'COURSE'}</Text>
                                    <Text style={styles.monoText}>{data.yearOfStudy ? `YEAR ${data.yearOfStudy}` : 'YEAR_XX'}</Text>
                                </View>
                            </View>

                            <View style={styles.barcode} />
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.form}>
                        <View style={styles.row}>
                            <TextInput
                                style={[styles.input, { flex: 1, marginRight: 8 }]}
                                placeholder="First Name"
                                placeholderTextColor="#666"
                                value={data.firstName}
                                onChangeText={(text) => updateData('firstName', text)}
                                returnKeyType="next"
                                blurOnSubmit={false}
                            />
                            <TextInput
                                style={[styles.input, { flex: 1, marginLeft: 8 }]}
                                placeholder="Last Name"
                                placeholderTextColor="#666"
                                value={data.lastName}
                                onChangeText={(text) => updateData('lastName', text)}
                                returnKeyType="next"
                                blurOnSubmit={false}
                            />
                        </View>

                        <TextInput
                            style={styles.input}
                            placeholder="University"
                            placeholderTextColor="#666"
                            value={data.university}
                            onChangeText={(text) => updateData('university', text)}
                            returnKeyType="next"
                            blurOnSubmit={false}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Course"
                            placeholderTextColor="#666"
                            value={data.course}
                            onChangeText={(text) => updateData('course', text)}
                            returnKeyType="next"
                            blurOnSubmit={false}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Year of Study (1-6)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={data.yearOfStudy}
                            onChangeText={(text) => updateData('yearOfStudy', text)}
                            maxLength={1}
                            returnKeyType="next"
                            onSubmitEditing={Keyboard.dismiss}
                        />

                        <TextInput
                            style={styles.input}
                            placeholder="Age (18+)"
                            placeholderTextColor="#666"
                            keyboardType="numeric"
                            value={data.age}
                            onChangeText={(text) => updateData('age', text)}
                            maxLength={2}
                            returnKeyType="done"
                            onSubmitEditing={Keyboard.dismiss}
                        />

                        <View style={styles.genderSection}>
                            <Text style={styles.genderLabel}>Gender</Text>
                            <View style={styles.genderRow}>
                                <TouchableOpacity
                                    style={[
                                        styles.genderCard,
                                        data.gender === 'male' && styles.genderCardActive
                                    ]}
                                    onPress={() => handleGenderSelect('male')}
                                >
                                    <Text style={[
                                        styles.genderEmoji,
                                        data.gender === 'male' && styles.genderTextActive
                                    ]}>♂</Text>
                                    <Text style={[
                                        styles.genderText,
                                        data.gender === 'male' && styles.genderTextActive
                                    ]}>Male</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.genderCard,
                                        data.gender === 'female' && styles.genderCardActive
                                    ]}
                                    onPress={() => handleGenderSelect('female')}
                                >
                                    <Text style={[
                                        styles.genderEmoji,
                                        data.gender === 'female' && styles.genderTextActive
                                    ]}>♀</Text>
                                    <Text style={[
                                        styles.genderText,
                                        data.gender === 'female' && styles.genderTextActive
                                    ]}>Female</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.genderCard,
                                        data.gender === 'other' && styles.genderCardActive
                                    ]}
                                    onPress={() => handleGenderSelect('other')}
                                >
                                    <Text style={[
                                        styles.genderEmoji,
                                        data.gender === 'other' && styles.genderTextActive
                                    ]}>⚥</Text>
                                    <Text style={[
                                        styles.genderText,
                                        data.gender === 'other' && styles.genderTextActive
                                    ]}>Other</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.button} onPress={handleNext}>
                            <Text style={styles.buttonText}>INITIALIZE ID →</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    header: {
        marginBottom: 30,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 5,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
    },
    cardContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    idCard: {
        width: '100%',
        height: 220,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#333',
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cardLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    hologram: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    photoPlaceholder: {
        width: 80,
        height: 100,
        backgroundColor: '#222',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        borderWidth: 1,
        borderColor: '#444',
    },
    photoText: {
        color: '#444',
        fontSize: 10,
        textAlign: 'center',
    },
    details: {
        flex: 1,
    },
    monoText: {
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: 14,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    highlight: {
        color: '#4ADE80', // Greenish
        fontWeight: 'bold',
    },
    barcode: {
        height: 30,
        backgroundColor: '#fff',
        opacity: 0.8,
        marginTop: 10,
    },
    form: {
        width: '100%',
    },
    row: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    input: {
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 8,
        padding: 15,
        color: '#fff',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        marginBottom: 15,
        fontSize: 16,
    },
    button: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        fontSize: 16,
    },
    genderSection: {
        marginBottom: 15,
    },
    genderLabel: {
        color: '#888',
        fontSize: 14,
        marginBottom: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    genderRow: {
        flexDirection: 'row',
        gap: 10,
    },
    genderCard: {
        flex: 1,
        backgroundColor: '#111',
        borderWidth: 1,
        borderColor: '#333',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    genderCardActive: {
        backgroundColor: Colors.dark.primary + '15',
        borderColor: Colors.dark.primary,
        borderWidth: 2,
    },
    genderEmoji: {
        fontSize: 32,
        marginBottom: 6,
        opacity: 0.6,
    },
    genderText: {
        color: '#888',
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    genderTextActive: {
        color: Colors.dark.primary,
        opacity: 1,
        fontWeight: 'bold',
    },
});
