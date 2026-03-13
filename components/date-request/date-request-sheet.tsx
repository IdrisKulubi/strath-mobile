import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    TextInput,
    Modal,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    ScrollView,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    withTiming,
    runOnJS,
    interpolate,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DateVibe, VIBE_EMOJIS, VIBE_LABELS, useCreateDateRequest } from '@/hooks/use-date-requests';

interface DateRequestSheetProps {
    visible: boolean;
    toUserId: string;
    toUserName: string;
    onClose: () => void;
    onSuccess?: () => void;
}

const VIBES: DateVibe[] = ['coffee', 'walk', 'dinner', 'hangout'];

const MAX_MESSAGE_LENGTH = 150;

export function DateRequestSheet({
    visible,
    toUserId,
    toUserName,
    onClose,
    onSuccess,
}: DateRequestSheetProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';

    const [selectedVibe, setSelectedVibe] = useState<DateVibe | null>(null);
    const [message, setMessage] = useState('');
    const [showSuccess, setShowSuccess] = useState(false);

    const translateY = useSharedValue(600);
    const backdropOpacity = useSharedValue(0);

    const { mutateAsync: createRequest, isPending } = useCreateDateRequest();

    // Vibe card scale values
    const vibeScales = useRef(VIBES.map(() => useSharedValue(1))).current;

    const openSheet = useCallback(() => {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        backdropOpacity.value = withTiming(1, { duration: 220 });
    }, [backdropOpacity, translateY]);

    const closeSheet = useCallback(() => {
        translateY.value = withTiming(600, { duration: 240 }, () => {
            runOnJS(onClose)();
        });
        backdropOpacity.value = withTiming(0, { duration: 200 });
    }, [backdropOpacity, onClose, translateY]);

    useEffect(() => {
        if (visible) {
            setSelectedVibe(null);
            setMessage('');
            setShowSuccess(false);
            openSheet();
        }
    }, [visible, openSheet]);

    const dragGesture = Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-20, 20])
        .onUpdate((e) => {
            if (e.translationY > 0) translateY.value = e.translationY;
        })
        .onEnd((e) => {
            if (e.translationY > 100 || e.velocityY > 800) {
                runOnJS(closeSheet)();
            } else {
                translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
            }
        });

    const sheetStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const handleVibeSelect = useCallback((vibe: DateVibe, idx: number) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedVibe(vibe);
        vibeScales[idx].value = withSpring(0.93, { damping: 10, stiffness: 300 }, () => {
            vibeScales[idx].value = withSpring(1, { damping: 12, stiffness: 260 });
        });
    }, [vibeScales]);

    const handleSend = useCallback(async () => {
        if (!selectedVibe || isPending) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            await createRequest({
                toUserId,
                vibe: selectedVibe,
                message: message.trim() || undefined,
            });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowSuccess(true);
            setTimeout(() => {
                closeSheet();
                onSuccess?.();
            }, 1400);
        } catch {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
    }, [selectedVibe, isPending, createRequest, toUserId, message, closeSheet, onSuccess]);

    return (
        <Modal visible={visible} transparent animationType="none" onRequestClose={closeSheet}>
            <KeyboardAvoidingView
                style={styles.root}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Backdrop */}
                <Animated.View style={[styles.backdrop, backdropStyle]}>
                    <Pressable style={StyleSheet.absoluteFill} onPress={closeSheet} />
                </Animated.View>

                {/* Sheet */}
                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: colors.background,
                            borderColor: colors.border,
                        },
                        sheetStyle,
                    ]}
                >
                    <GestureDetector gesture={dragGesture}>
                        <View style={[styles.handle, { borderBottomColor: colors.border }]}>
                            <View style={[styles.dragBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' }]} />
                            <Text style={[styles.sheetTitle, { color: colors.foreground }]}>
                                Invite {toUserName} on a date?
                            </Text>
                            <Pressable onPress={closeSheet} style={[styles.closeBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                                <Ionicons name="close" size={18} color={colors.foreground} />
                            </Pressable>
                        </View>
                    </GestureDetector>

                    {showSuccess ? (
                        <View style={styles.successContainer}>
                            <View style={[styles.successIcon, { backgroundColor: '#10b98120' }]}>
                                <Ionicons name="checkmark-circle" size={52} color="#10b981" />
                            </View>
                            <Text style={[styles.successTitle, { color: colors.foreground }]}>
                                Invite sent 💜
                            </Text>
                            <Text style={[styles.successSub, { color: colors.mutedForeground }]}>
                                We'll let you know when {toUserName} responds.
                            </Text>
                        </View>
                    ) : (
                        <ScrollView
                            contentContainerStyle={styles.content}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                        >
                            {/* Vibe section */}
                            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                                Choose a date vibe
                            </Text>
                            <View style={styles.vibeGrid}>
                                {VIBES.map((vibe, idx) => {
                                    const isSelected = selectedVibe === vibe;
                                    const scaleStyle = useAnimatedStyle(() => ({
                                        transform: [{ scale: vibeScales[idx].value }],
                                    }));
                                    return (
                                        <Animated.View key={vibe} style={[styles.vibeCardWrap, scaleStyle]}>
                                            <Pressable
                                                onPress={() => handleVibeSelect(vibe, idx)}
                                                style={[
                                                    styles.vibeCard,
                                                    {
                                                        backgroundColor: isSelected
                                                            ? colors.primary + '18'
                                                            : isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                                        borderColor: isSelected ? colors.primary : colors.border,
                                                        borderWidth: isSelected ? 2 : 1,
                                                    },
                                                ]}
                                            >
                                                <Text style={styles.vibeEmoji}>{VIBE_EMOJIS[vibe]}</Text>
                                                <Text style={[styles.vibeLabel, { color: isSelected ? colors.primary : colors.foreground, fontWeight: isSelected ? '700' : '500' }]}>
                                                    {VIBE_LABELS[vibe]}
                                                </Text>
                                            </Pressable>
                                        </Animated.View>
                                    );
                                })}
                            </View>

                            {/* Optional message */}
                            <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
                                Add a message <Text style={{ color: colors.mutedForeground, fontWeight: '400' }}>(optional)</Text>
                            </Text>
                            <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <TextInput
                                    style={[styles.input, { color: colors.foreground }]}
                                    placeholder={`Hey ${toUserName}, I'd love to meet you.`}
                                    placeholderTextColor={colors.mutedForeground}
                                    value={message}
                                    onChangeText={(t) => setMessage(t.slice(0, MAX_MESSAGE_LENGTH))}
                                    multiline
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    returnKeyType="done"
                                />
                                <Text style={[styles.charCount, { color: colors.mutedForeground }]}>
                                    {message.length}/{MAX_MESSAGE_LENGTH}
                                </Text>
                            </View>

                            {/* Send button */}
                            <Pressable
                                onPress={handleSend}
                                disabled={!selectedVibe || isPending}
                                style={[
                                    styles.sendBtn,
                                    {
                                        backgroundColor: selectedVibe ? colors.primary : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                        opacity: isPending ? 0.75 : 1,
                                    },
                                ]}
                            >
                                {isPending ? (
                                    <ActivityIndicator size="small" color="#fff" />
                                ) : (
                                    <Text style={[styles.sendBtnText, { color: selectedVibe ? '#fff' : colors.mutedForeground }]}>
                                        Send Invite
                                    </Text>
                                )}
                            </Pressable>
                        </ScrollView>
                    )}
                </Animated.View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        borderWidth: 1,
        borderBottomWidth: 0,
        maxHeight: '85%',
    },
    handle: {
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
    },
    dragBar: {
        position: 'absolute',
        top: 6,
        left: '50%',
        marginLeft: -20,
        width: 40,
        height: 4,
        borderRadius: 999,
    },
    sheetTitle: {
        fontSize: 17,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        padding: 20,
        gap: 12,
        paddingBottom: 36,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    vibeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 8,
    },
    vibeCardWrap: {
        width: '47%',
    },
    vibeCard: {
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        gap: 6,
    },
    vibeEmoji: {
        fontSize: 28,
    },
    vibeLabel: {
        fontSize: 14,
    },
    inputWrap: {
        borderRadius: 14,
        borderWidth: 1,
        padding: 12,
        gap: 6,
        marginBottom: 4,
    },
    input: {
        fontSize: 15,
        lineHeight: 22,
        minHeight: 60,
        textAlignVertical: 'top',
    },
    charCount: {
        fontSize: 11,
        textAlign: 'right',
    },
    sendBtn: {
        borderRadius: 16,
        paddingVertical: 15,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
        minHeight: 52,
    },
    sendBtnText: {
        fontSize: 16,
        fontWeight: '700',
    },
    successContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 14,
    },
    successIcon: {
        width: 88,
        height: 88,
        borderRadius: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    successTitle: {
        fontSize: 20,
        fontWeight: '800',
        textAlign: 'center',
    },
    successSub: {
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});
