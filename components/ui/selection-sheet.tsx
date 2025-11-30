import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    TouchableWithoutFeedback,
    Platform
} from 'react-native';
import { useTheme } from '@/hooks/use-theme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

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

export function SelectionSheet({
    visible,
    onClose,
    title,
    options,
    value,
    onSelect,
}: SelectionSheetProps) {
    const { colors } = useTheme();

    const handleSelect = (selectedValue: string) => {
        onSelect(selectedValue);
        onClose();
    };

    const renderOption = (option: string | Option, index: number) => {
        const optionValue = typeof option === 'string' ? option : option.value;
        const optionLabel = typeof option === 'string' ? option : option.label;
        const optionEmoji = typeof option === 'object' ? option.emoji : null;
        const isSelected = value === optionValue;

        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.optionItem,
                    {
                        borderBottomColor: colors.border,
                        backgroundColor: isSelected ? colors.primary + '15' : 'transparent'
                    }
                ]}
                onPress={() => handleSelect(optionValue)}
            >
                <View style={styles.optionContent}>
                    {optionEmoji && <Text style={styles.emoji}>{optionEmoji}</Text>}
                    <Text
                        style={[
                            styles.optionText,
                            {
                                color: isSelected ? colors.primary : colors.foreground,
                                fontWeight: isSelected ? '600' : '400'
                            }
                        ]}
                    >
                        {optionLabel}
                    </Text>
                </View>
                {isSelected && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                )}
            </TouchableOpacity>
        );
    };

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
                        <View style={[styles.sheetContainer, { backgroundColor: colors.card }]}>
                            <View style={[styles.header, { borderBottomColor: colors.border }]}>
                                <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Ionicons name="close" size={24} color={colors.muted} />
                                </TouchableOpacity>
                            </View>
                            <ScrollView
                                style={styles.scrollView}
                                contentContainerStyle={styles.scrollContent}
                                showsVerticalScrollIndicator={false}
                            >
                                {options.map((option, index) => renderOption(option, index))}
                            </ScrollView>
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
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    sheetContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: Platform.OS === 'ios' ? 34 : 24,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: -2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    closeButton: {
        padding: 4,
    },
    scrollView: {
        maxHeight: 400,
    },
    scrollContent: {
        paddingBottom: 16,
    },
    optionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    emoji: {
        fontSize: 20,
        marginRight: 12,
    },
    optionText: {
        fontSize: 16,
    },
});
