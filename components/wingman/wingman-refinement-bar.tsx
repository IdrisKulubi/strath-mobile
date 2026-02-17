import React, { useMemo, useState } from 'react';
import { View, StyleSheet, Pressable, TextInput } from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { FunnelSimple, PaperPlaneRight } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

interface WingmanRefinementBarProps {
    currentQuery: string | null;
    onRefine: (refinement: string) => void;
    isLoading?: boolean;
}

function getDefaultRefinements(currentQuery: string | null): string[] {
    const base = [
        'more introverted',
        'closer to campus',
        'older by 1-2 years',
        'more ambitious',
        'more chill',
        'more into fitness',
    ];

    if (!currentQuery) return base.slice(0, 4);

    const lower = currentQuery.toLowerCase();
    return base.filter(item => !lower.includes(item.split(' ')[1])).slice(0, 4);
}

export function WingmanRefinementBar({
    currentQuery,
    onRefine,
    isLoading = false,
}: WingmanRefinementBarProps) {
    const { colors, isDark } = useTheme();
    const [customRefine, setCustomRefine] = useState('');

    const quickRefinements = useMemo(() => getDefaultRefinements(currentQuery), [currentQuery]);

    const handleQuickRefine = (value: string) => {
        if (isLoading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onRefine(value);
    };

    const handleSubmitCustom = () => {
        const value = customRefine.trim();
        if (!value || isLoading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onRefine(value);
        setCustomRefine('');
    };

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <FunnelSimple size={14} color={colors.primary} weight="fill" />
                <Text style={[styles.title, { color: colors.mutedForeground }]}>Refine your results</Text>
            </View>

            <View style={styles.chipsRow}>
                {quickRefinements.map((item) => (
                    <Pressable
                        key={item}
                        onPress={() => handleQuickRefine(item)}
                        disabled={isLoading}
                        style={[styles.chip, {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                            borderColor: colors.border,
                            opacity: isLoading ? 0.6 : 1,
                        }]}
                    >
                        <Text style={[styles.chipText, { color: colors.foreground }]}>{item}</Text>
                    </Pressable>
                ))}
            </View>

            <View style={[styles.inputRow, {
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderColor: colors.border,
            }]}
            >
                <TextInput
                    value={customRefine}
                    onChangeText={setCustomRefine}
                    placeholder="Custom refinement (e.g. more expressive)"
                    placeholderTextColor={colors.mutedForeground}
                    style={[styles.input, { color: colors.foreground }]}
                    editable={!isLoading}
                    returnKeyType="send"
                    onSubmitEditing={handleSubmitCustom}
                />
                <Pressable
                    onPress={handleSubmitCustom}
                    disabled={isLoading || customRefine.trim().length === 0}
                    style={[styles.sendButton, {
                        backgroundColor: colors.primary,
                        opacity: isLoading || customRefine.trim().length === 0 ? 0.45 : 1,
                    }]}
                >
                    <PaperPlaneRight size={14} color={colors.primaryForeground} weight="fill" />
                </Pressable>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 10,
        marginHorizontal: 16,
        marginBottom: 4,
        gap: 10,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    title: {
        fontSize: 12,
        fontWeight: '600',
    },
    chipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    inputRow: {
        borderWidth: 1,
        borderRadius: 12,
        paddingLeft: 12,
        paddingRight: 8,
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    input: {
        flex: 1,
        fontSize: 13,
        fontWeight: '500',
        paddingVertical: 8,
    },
    sendButton: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
