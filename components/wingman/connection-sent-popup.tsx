import React, { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeOut, ZoomIn, ZoomOut } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Sparkle, PaperPlaneTilt } from 'phosphor-react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';

interface ConnectionSentPopupProps {
    visible: boolean;
    firstName?: string | null;
    onClose: () => void;
}

export function ConnectionSentPopup({ visible, firstName, onClose }: ConnectionSentPopupProps) {
    const { colors, isDark } = useTheme();

    useEffect(() => {
        if (visible) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
    }, [visible]);

    const person = firstName?.trim() || 'They';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)} style={styles.overlay}>
                <Pressable style={styles.backdrop} onPress={onClose} />

                <Animated.View
                    entering={ZoomIn.springify().damping(16).stiffness(220)}
                    exiting={ZoomOut.duration(120)}
                    style={[styles.card, {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                    }]}
                >
                    <LinearGradient
                        colors={isDark
                            ? [colors.primary, colors.accent, colors.primary]
                            : [colors.primary, colors.accent, colors.primary]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.badge}
                    >
                        <PaperPlaneTilt size={20} color={colors.primaryForeground} weight="fill" />
                    </LinearGradient>

                    <View style={styles.titleRow}>
                        <Sparkle size={16} color={colors.primary} weight="fill" />
                        <Text style={[styles.title, { color: colors.foreground }]}>Connection Sent</Text>
                    </View>

                    <Text style={[styles.description, { color: colors.mutedForeground }]}>
                        Your invite is on the way to {person}. If they connect back, Wingman will move you straight to chat.
                    </Text>

                    <View style={[styles.infoPill, {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : colors.secondary,
                        borderColor: colors.border,
                    }]}
                    >
                        <Text style={[styles.infoText, { color: colors.foreground }]}>✨ Wingman will keep finding fresh people while you wait</Text>
                    </View>

                    <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onClose}>
                        <Text style={[styles.buttonText, { color: colors.primaryForeground }]}>Keep Exploring</Text>
                    </Pressable>
                </Animated.View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    card: {
        width: '100%',
        borderRadius: 24,
        borderWidth: 1,
        paddingHorizontal: 18,
        paddingVertical: 20,
        gap: 14,
        alignItems: 'center',
    },
    badge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
    },
    description: {
        fontSize: 14,
        lineHeight: 21,
        textAlign: 'center',
        paddingHorizontal: 2,
    },
    infoPill: {
        width: '100%',
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 10,
        paddingVertical: 10,
    },
    infoText: {
        fontSize: 13,
        textAlign: 'center',
        fontWeight: '500',
    },
    button: {
        width: '100%',
        borderRadius: 14,
        paddingVertical: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
