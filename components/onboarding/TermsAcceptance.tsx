import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Platform,
    Linking,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

interface TermsAcceptanceProps {
    onAccept: () => void;
    onDecline?: () => void;
}

export function TermsAcceptance({ onAccept, onDecline }: TermsAcceptanceProps) {
    const [accepted, setAccepted] = useState({
        terms: false,
        privacy: false,
        community: false,
    });

    const allAccepted = accepted.terms && accepted.privacy && accepted.community;

    const toggleAcceptance = (key: keyof typeof accepted) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setAccepted(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleContinue = () => {
        if (allAccepted) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onAccept();
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <Animated.View 
                    entering={FadeInDown.delay(100).springify()}
                    style={styles.header}
                >
                    <View style={styles.iconContainer}>
                        <Ionicons name="shield-checkmark" size={48} color="#EC4899" />
                    </View>
                    <Text style={styles.title}>Before We Start</Text>
                    <Text style={styles.subtitle}>
                        Please review and accept our community guidelines to keep Strathspace safe and fun for everyone.
                    </Text>
                </Animated.View>

                {/* Agreement Cards */}
                <Animated.View 
                    entering={FadeInUp.delay(200).springify()}
                    style={styles.cardsContainer}
                >
                    {/* Terms of Service */}
                    <TouchableOpacity 
                        style={[styles.card, accepted.terms && styles.cardAccepted]}
                        onPress={() => toggleAcceptance('terms')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.checkbox, accepted.terms && styles.checkboxChecked]}>
                                {accepted.terms && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>Terms of Service</Text>
                                <Text style={styles.cardDescription}>
                                    I agree to the rules and guidelines for using Strathspace
                                </Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.viewButton}
                                onPress={() => Linking.openURL('https://strathspace.com/terms')}
                            >
                                <Text style={styles.viewButtonText}>View</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>

                    {/* Privacy Policy */}
                    <TouchableOpacity 
                        style={[styles.card, accepted.privacy && styles.cardAccepted]}
                        onPress={() => toggleAcceptance('privacy')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.checkbox, accepted.privacy && styles.checkboxChecked]}>
                                {accepted.privacy && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>Privacy Policy</Text>
                                <Text style={styles.cardDescription}>
                                    I understand how my data is collected and used
                                </Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.viewButton}
                                onPress={() => Linking.openURL('https://strathspace.com/privacy')}
                            >
                                <Text style={styles.viewButtonText}>View</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>

                    {/* Community Guidelines */}
                    <TouchableOpacity 
                        style={[styles.card, accepted.community && styles.cardAccepted]}
                        onPress={() => toggleAcceptance('community')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.cardContent}>
                            <View style={[styles.checkbox, accepted.community && styles.checkboxChecked]}>
                                {accepted.community && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardTitle}>Community Guidelines</Text>
                                <Text style={styles.cardDescription}>
                                    I will treat others with respect and report bad behavior
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                {/* Community Standards Summary */}
                <Animated.View 
                    entering={FadeInUp.delay(300).springify()}
                    style={styles.summaryContainer}
                >
                    <Text style={styles.summaryTitle}>Our Community Standards</Text>
                    <View style={styles.summaryItem}>
                        <Ionicons name="ban" size={20} color="#EF4444" />
                        <Text style={styles.summaryText}>
                            <Text style={styles.bold}>Zero tolerance</Text> for harassment, hate speech, or abusive behavior
                        </Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="flag" size={20} color="#F59E0B" />
                        <Text style={styles.summaryText}>
                            <Text style={styles.bold}>Report</Text> inappropriate content or users who make you uncomfortable
                        </Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="shield" size={20} color="#10B981" />
                        <Text style={styles.summaryText}>
                            <Text style={styles.bold}>Block</Text> anyone at any time - they will not be notified
                        </Text>
                    </View>
                    <View style={styles.summaryItem}>
                        <Ionicons name="time" size={20} color="#3B82F6" />
                        <Text style={styles.summaryText}>
                            Reports reviewed within <Text style={styles.bold}>24 hours</Text> - violators will be removed
                        </Text>
                    </View>
                </Animated.View>
            </ScrollView>

            {/* Bottom Action */}
            <Animated.View 
                entering={FadeInUp.delay(400).springify()}
                style={styles.bottomContainer}
            >
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!allAccepted}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={allAccepted ? ['#EC4899', '#F43F5E'] : ['#9CA3AF', '#9CA3AF']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.continueButton, !allAccepted && styles.continueButtonDisabled]}
                    >
                        <Text style={styles.continueButtonText}>
                            {allAccepted ? "I Agree - Let's Go! 🎉" : "Accept all to continue"}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
                
                <Text style={styles.disclaimer}>
                    By continuing, you confirm you are at least 18 years old and a  University student.
                </Text>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 200,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#1a1a1a',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
    },
    cardsContainer: {
        gap: 12,
        marginBottom: 24,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    cardAccepted: {
        borderColor: '#EC4899',
        backgroundColor: 'rgba(236, 72, 153, 0.05)',
    },
    cardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#D1D5DB',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    checkboxChecked: {
        backgroundColor: '#EC4899',
        borderColor: '#EC4899',
    },
    cardText: {
        flex: 1,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 2,
    },
    cardDescription: {
        fontSize: 13,
        color: '#6B7280',
    },
    viewButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        borderRadius: 8,
    },
    viewButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#EC4899',
    },
    summaryContainer: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginTop: 8,
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    summaryItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 12,
    },
    summaryText: {
        flex: 1,
        fontSize: 14,
        color: '#4B5563',
        lineHeight: 20,
    },
    bold: {
        fontWeight: '600',
        color: '#1a1a1a',
    },
    bottomContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    continueButton: {
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    continueButtonDisabled: {
        opacity: 0.6,
    },
    continueButtonText: {
        fontSize: 17,
        fontWeight: '600',
        color: '#FFF',
    },
    disclaimer: {
        fontSize: 12,
        color: '#9CA3AF',
        textAlign: 'center',
        marginTop: 12,
        lineHeight: 16,
    },
});
