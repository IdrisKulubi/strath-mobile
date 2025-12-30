import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Pressable,
    TouchableWithoutFeedback,
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { X, Shield, Flag, Prohibit, XCircle } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface SafetyToolkitModalProps {
    visible: boolean;
    onClose: () => void;
    partnerName: string;
    onUnmatch: () => void;
    onBlock: () => void;
    onReport: () => void;
    onSafetyCenter: () => void;
}

export function SafetyToolkitModal({
    visible,
    onClose,
    partnerName,
    onUnmatch,
    onBlock,
    onReport,
    onSafetyCenter,
}: SafetyToolkitModalProps) {
    const { colors } = useTheme();

    const handleAction = (action: () => void) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        action();
        onClose();
    };

    const textColor = colors.foreground;
    const mutedColor = colors.mutedForeground;

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={[styles.sheet, { backgroundColor: colors.card }]}>
                            {/* Handle */}
                            <View style={styles.handleRow}>
                                <View style={[styles.handle, { backgroundColor: colors.border }]} />
                            </View>

                            {/* Header */}
                            <View style={styles.headerRow}>
                                <Pressable onPress={onClose} hitSlop={12}>
                                    <X size={24} color={mutedColor} />
                                </Pressable>
                                <Text style={[styles.title, { color: textColor }]}>
                                    Safety Toolkit
                                </Text>
                                <View style={{ width: 24 }} />
                            </View>

                            {/* Options */}
                            <View style={styles.options}>
                                {/* Unmatch */}
                                <Pressable
                                    style={styles.option}
                                    onPress={() => handleAction(onUnmatch)}
                                >
                                    <XCircle size={22} color="#FF3B30" />
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionTitle, { color: textColor }]}>
                                            UNMATCH FROM {partnerName.toUpperCase()}
                                        </Text>
                                        <Text style={[styles.optionDesc, { color: mutedColor }]}>
                                            No longer interested? Remove them from your matches.
                                        </Text>
                                    </View>
                                </Pressable>

                                {/* Block */}
                                <Pressable
                                    style={styles.option}
                                    onPress={() => handleAction(onBlock)}
                                >
                                    <Prohibit size={22} color={textColor} />
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionTitle, { color: textColor }]}>
                                            BLOCK {partnerName.toUpperCase()}
                                        </Text>
                                        <Text style={[styles.optionDesc, { color: mutedColor }]}>
                                            You won't see them, and they won't see you.
                                        </Text>
                                    </View>
                                </Pressable>

                                {/* Report */}
                                <Pressable
                                    style={styles.option}
                                    onPress={() => handleAction(onReport)}
                                >
                                    <Flag size={22} color="#FF3B30" />
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionTitle, { color: textColor }]}>
                                            REPORT {partnerName.toUpperCase()}
                                        </Text>
                                        <Text style={[styles.optionDesc, { color: mutedColor }]}>
                                            Don't worry—we won't tell them.
                                        </Text>
                                    </View>
                                </Pressable>

                                {/* Safety Center */}
                                <Pressable
                                    style={styles.option}
                                    onPress={() => handleAction(onSafetyCenter)}
                                >
                                    <Shield size={22} color="#007AFF" />
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionTitle, { color: textColor }]}>
                                            ACCESS SAFETY CENTER
                                        </Text>
                                        <Text style={[styles.optionDesc, { color: mutedColor }]}>
                                            Your well-being matters. Find safety resources and tools here.
                                        </Text>
                                    </View>
                                </Pressable>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 48,
    },
    handleRow: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 5,
        borderRadius: 3,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
    },
    options: {
        paddingHorizontal: 20,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        marginBottom: 24,
    },
    optionText: {
        flex: 1,
    },
    optionTitle: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    optionDesc: {
        fontSize: 13,
        lineHeight: 18,
    },
});
