import React, { useEffect } from 'react';
import {
    View,
    StyleSheet,
    Modal,
    Pressable,
    Dimensions,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { DiscoverProfile } from '@/hooks/use-discover';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withSequence,
    withDelay,
    withTiming,
} from 'react-native-reanimated';
import { ChatCircle, X } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface MatchModalProps {
    visible: boolean;
    profile: DiscoverProfile | null;
    currentUserImage?: string | null;
    onClose: () => void;
    matchId?: string;
}

export function MatchModal({
    visible,
    profile,
    currentUserImage,
    onClose,
    matchId,
}: MatchModalProps) {
    const { colors } = useTheme();
    const router = useRouter();

    // Animation values
    const titleScale = useSharedValue(0);
    const photo1TranslateX = useSharedValue(-SCREEN_WIDTH);
    const photo2TranslateX = useSharedValue(SCREEN_WIDTH);
    const buttonsOpacity = useSharedValue(0);

    // Get profile photo
    const profilePhoto = profile?.profilePhoto || profile?.user?.image || profile?.photos?.[0];

    useEffect(() => {
        if (visible) {
            // Trigger celebration haptic
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            // Animate elements in sequence
            titleScale.value = withSpring(1, { damping: 10, stiffness: 100 });
            photo1TranslateX.value = withDelay(100, withSpring(0, { damping: 15, stiffness: 120 }));
            photo2TranslateX.value = withDelay(100, withSpring(0, { damping: 15, stiffness: 120 }));
            buttonsOpacity.value = withDelay(400, withTiming(1, { duration: 300 }));
        } else {
            // Reset animations
            titleScale.value = 0;
            photo1TranslateX.value = -SCREEN_WIDTH;
            photo2TranslateX.value = SCREEN_WIDTH;
            buttonsOpacity.value = 0;
        }
    }, [visible]);

    const titleStyle = useAnimatedStyle(() => ({
        transform: [{ scale: titleScale.value }],
    }));

    const photo1Style = useAnimatedStyle(() => ({
        transform: [{ translateX: photo1TranslateX.value }],
    }));

    const photo2Style = useAnimatedStyle(() => ({
        transform: [{ translateX: photo2TranslateX.value }],
    }));

    const buttonsStyle = useAnimatedStyle(() => ({
        opacity: buttonsOpacity.value,
    }));

    const handleMessage = () => {
        onClose();
        if (matchId) {
            router.push(`/chat/${matchId}`);
        }
    };

    const displayName = profile?.firstName || profile?.user?.name?.split(' ')[0] || 'Someone';

    if (!profile) return null;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <LinearGradient
                    colors={[colors.primary + 'CC', '#FF6B6B99', colors.primary + 'CC']}
                    style={styles.gradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Close button */}
                <Pressable style={styles.closeButton} onPress={onClose}>
                    <X size={28} color="#FFFFFF" weight="bold" />
                </Pressable>

                {/* Content */}
                <View style={styles.content}>
                    {/* Title */}
                    <Animated.View style={[styles.titleContainer, titleStyle]}>
                        <Text style={styles.matchText}>You&apos;re Connected! 🎉</Text>
                        <Text style={styles.subText}>
                            You and {displayName} want to connect
                        </Text>
                    </Animated.View>

                    {/* Photos */}
                    <View style={styles.photosContainer}>
                        <Animated.View style={[styles.photoWrapper, photo1Style]}>
                            {currentUserImage ? (
                                <CachedImage uri={currentUserImage} style={styles.photo} fallbackType="avatar" />
                            ) : (
                                <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.placeholderText}>You</Text>
                                </View>
                            )}
                        </Animated.View>

                        <Animated.View style={[styles.photoWrapper, photo2Style]}>
                            {profilePhoto ? (
                                <CachedImage uri={profilePhoto} style={styles.photo} fallbackType="avatar" />
                            ) : (
                                <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.primary }]}>
                                    <Text style={styles.placeholderText}>{displayName[0]}</Text>
                                </View>
                            )}
                        </Animated.View>
                    </View>

                    {/* Buttons */}
                    <Animated.View style={[styles.buttonsContainer, buttonsStyle]}>
                        <Pressable
                            style={[styles.messageButton, { backgroundColor: '#FFFFFF' }]}
                            onPress={handleMessage}
                        >
                            <ChatCircle size={22} color={colors.primary} weight="fill" />
                            <Text style={[styles.messageButtonText, { color: colors.primary }]}>
                                Send a Message
                            </Text>
                        </Pressable>

                        <Pressable style={styles.keepSwipingButton} onPress={onClose}>
                            <Text style={styles.keepSwipingText}>Keep Exploring</Text>
                        </Pressable>
                    </Animated.View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
    },
    gradient: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.6,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    titleContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    matchText: {
        fontSize: 36,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center',
    },
    subText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 8,
    },
    photosContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: -20,
        marginBottom: 40,
    },
    photoWrapper: {
        borderWidth: 4,
        borderColor: '#FFFFFF',
        borderRadius: 80,
        overflow: 'hidden',
    },
    photo: {
        width: 120,
        height: 120,
        borderRadius: 60,
    },
    photoPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    placeholderText: {
        fontSize: 40,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    buttonsContainer: {
        width: '100%',
        gap: 12,
    },
    messageButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 16,
        borderRadius: 28,
    },
    messageButtonText: {
        fontSize: 17,
        fontWeight: '700',
    },
    keepSwipingButton: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    keepSwipingText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.8)',
    },
});
