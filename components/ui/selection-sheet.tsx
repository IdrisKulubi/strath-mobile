import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TouchableWithoutFeedback, Platform } from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';

interface Option {
    value: string;
    label: string;
    emoji?: string;
}

interface SelectionSheetProps {
    visible: boolean;
    onClose: () => void;
    title: string;
    options: (string | Option)[];
    value?: string;
    onSelect: (value: string) => void;
}

export function SelectionSheet({ visible, onClose, title, options, value, onSelect }: SelectionSheetProps) {
    const { colors } = useTheme();
    const [tempValue, setTempValue] = React.useState<string | undefined>(value);

    React.useEffect(() => {
        if (visible) {
            setTempValue(value);
        }
    }, [visible, value]);

    const handleSelectOption = (selectedValue: string) => {
        Haptics.selectionAsync();
        setTempValue(selectedValue);
    };

    const handleSave = () => {
        if (tempValue) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onSelect(tempValue);
            onClose();
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
                </TouchableWithoutFeedback>

                <View style={[styles.sheet, { backgroundColor: colors.background }]}>
                    {/* Handle Bar */}
                    <View style={styles.handleContainer}>
                        <View style={[styles.handle, { backgroundColor: colors.border }]} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color={colors.foreground} />
                        </TouchableOpacity>
                        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                        <View style={{ width: 24 }} />
                    </View>

                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        {options.map((option, index) => {
                            const isString = typeof option === 'string';
                            const optionValue = isString ? option : option.value;
                            const optionLabel = isString ? option : option.label;
                            const optionEmoji = !isString ? option.emoji : null;
                            const isSelected = tempValue === optionValue;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.option,
                                        isSelected && { backgroundColor: colors.card, borderColor: colors.primary, borderWidth: 1 },
                                        !isSelected && { backgroundColor: colors.card, borderColor: 'transparent', borderWidth: 1 }
                                    ]}
                                    onPress={() => handleSelectOption(optionValue)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.optionRow}>
                                        {optionEmoji && <Text style={styles.emoji}>{optionEmoji}</Text>}
                                        <Text style={[
                                            styles.optionText,
                                            { color: colors.foreground },
                                            isSelected && styles.selectedText
                                        ]}>
                                            {optionLabel}
                                        </Text>
                                    </View>
                                    <View style={[
                                        styles.checkbox,
                                        { borderColor: isSelected ? colors.primary : colors.border },
                                        isSelected && { backgroundColor: colors.primary }
                                    ]}>
                                        {isSelected && <Ionicons name="checkmark" size={16} color="white" />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                        <View style={{ height: 100 }} />
                    </ScrollView>

                    {/* Footer with Save Button */}
                    <View style={[styles.footer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
                        <TouchableOpacity
                            style={[styles.saveButton, { backgroundColor: colors.foreground }]}
                            onPress={handleSave}
                        >
                            <Text style={[styles.saveButtonText, { color: colors.background }]}>Save and close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        height: '85%',
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    handle: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    closeButton: {
        padding: 4,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 0,
    },
    option: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 12,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 24,
        marginRight: 16,
    },
    optionText: {
        fontSize: 17,
        fontWeight: '500',
    },
    selectedText: {
        fontWeight: '700',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    footer: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    saveButton: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButtonText: {
        fontSize: 17,
        fontWeight: 'bold',
    },
});
