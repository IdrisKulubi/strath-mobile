import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { CheckCircle } from 'phosphor-react-native';
import { useTheme } from '@/hooks/use-theme';

interface ChipOption {
    value: string;
    label: string;
    emoji?: string;
}

interface ChipSelectorProps {
    options: ChipOption[];
    selected: string | string[] | null | undefined;
    onSelect: (value: string) => void;
    multiSelect?: boolean;
    columns?: number;
}

export function ChipSelector({
    options,
    selected,
    onSelect,
    multiSelect = false,
    columns = 3,
}: ChipSelectorProps) {
    const { colors, isDark } = useTheme();

    const isSelected = (value: string): boolean => {
        if (multiSelect && Array.isArray(selected)) {
            return selected.includes(value);
        }
        return selected === value;
    };

    return (
        <View style={[styles.container, { gap: 8 }]}>
            {options.map((option, index) => {
                const selected = isSelected(option.value);

                return (
                    <Animated.View
                        key={option.value}
                        entering={FadeInDown.delay(index * 30).springify()}
                        style={[
                            styles.chipWrapper,
                            { width: columns === 2 ? '48%' : columns === 3 ? '31%' : 'auto' },
                        ]}
                    >
                        <TouchableOpacity
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                onSelect(option.value);
                            }}
                            activeOpacity={0.7}
                            style={[
                                styles.chip,
                                {
                                    backgroundColor: selected
                                        ? isDark
                                            ? 'rgba(236, 72, 153, 0.2)'
                                            : 'rgba(236, 72, 153, 0.12)'
                                        : isDark
                                        ? 'rgba(255, 255, 255, 0.06)'
                                        : 'rgba(0, 0, 0, 0.04)',
                                    borderColor: selected
                                        ? colors.primary
                                        : isDark
                                        ? 'rgba(255, 255, 255, 0.1)'
                                        : 'rgba(0, 0, 0, 0.08)',
                                    borderWidth: selected ? 1.5 : 1,
                                },
                            ]}
                        >
                            {option.emoji && (
                                <Text style={styles.chipEmoji}>{option.emoji}</Text>
                            )}
                            <Text
                                style={[
                                    styles.chipText,
                                    {
                                        color: selected ? colors.primary : colors.foreground,
                                        fontWeight: selected ? '600' : '500',
                                    },
                                ]}
                                numberOfLines={1}
                            >
                                {option.label}
                            </Text>
                            {selected && (
                                <CheckCircle
                                    size={16}
                                    color={colors.primary}
                                    weight="fill"
                                    style={styles.checkIcon}
                                />
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    chipWrapper: {
        marginBottom: 0,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        gap: 6,
    },
    chipEmoji: {
        fontSize: 16,
    },
    chipText: {
        fontSize: 14,
    },
    checkIcon: {
        marginLeft: 2,
    },
});
