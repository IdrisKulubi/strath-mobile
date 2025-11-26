import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Pressable } from 'react-native';
import { PhaseProps } from './types';
import * as Haptics from 'expo-haptics';
import Animated, {
    FadeIn,
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    withRepeat,
    Easing,
    runOnJS
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function Phase5Launch({ data, updateData, onNext, onBack, isSubmitting }: PhaseProps) {
    const [isScanning, setIsScanning] = useState(false);
    const progress = useSharedValue(0);
    const router = useRouter();

    const handlePressIn = () => {
        if (isSubmitting) return;
        setIsScanning(true);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        progress.value = withTiming(1, { duration: 2000, easing: Easing.linear }, (finished) => {
            if (finished) {
                runOnJS(completeOnboarding)();
            }
        });
    };

    const handlePressOut = () => {
        if (progress.value < 1) {
            setIsScanning(false);
            progress.value = withTiming(0, { duration: 300 });
        }
    };

    const completeOnboarding = () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onNext(); // This triggers the final submission in the parent
    };

    const scannerStyle = useAnimatedStyle(() => {
        return {
            height: `${progress.value * 100}%`,
            opacity: 0.5 + (progress.value * 0.5),
        };
    });

    const glowStyle = useAnimatedStyle(() => {
        return {
            opacity: withRepeat(withTiming(0.8, { duration: 1000 }), -1, true),
        };
    });

    return (
        <View style={styles.container}>
            <Animated.View entering={FadeIn.duration(800)} style={styles.header}>
                <Text style={styles.title}>{isSubmitting ? 'Initializing...' : 'System Ready'}</Text>
                <Text style={styles.subtitle}>{isSubmitting ? 'Uploading your digital DNA...' : 'Authenticate to launch.'}</Text>
            </Animated.View>

            <View style={styles.content}>
                <View style={styles.scannerContainer}>
                    <Pressable
                        onPressIn={handlePressIn}
                        onPressOut={handlePressOut}
                        style={[styles.fingerprintArea, isSubmitting && { opacity: 0.5 }]}
                        disabled={isSubmitting}
                    >
                        <View style={styles.fingerprintRing}>
                            <Animated.View style={[styles.scanFill, scannerStyle]}>
                                <LinearGradient
                                    colors={[Colors.dark.accent, Colors.dark.primary]}
                                    style={{ flex: 1 }}
                                />
                            </Animated.View>
                            <Text style={styles.fingerprintIcon}>☝️</Text>
                        </View>
                    </Pressable>
                    <Text style={styles.instruction}>{isSubmitting ? 'PLEASE WAIT' : 'HOLD TO LAUNCH'}</Text>
                </View>
            </View>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>← BACK</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#000',
    },
    header: {
        marginTop: 30,
        marginBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#fff',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 5,
        textAlign: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerContainer: {
        alignItems: 'center',
    },
    fingerprintArea: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    fingerprintRing: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 3,
        borderColor: Colors.dark.primary,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative',
    },
    scanFill: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Colors.dark.primary,
    },
    fingerprintIcon: {
        fontSize: 50,
        zIndex: 1,
    },
    instruction: {
        color: Colors.dark.primary,
        fontWeight: 'bold',
        letterSpacing: 2,
        fontSize: 14,
    },
    footer: {
        paddingBottom: 20,
    },
    backButton: {
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
});
