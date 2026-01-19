import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const QUALITIES = [
    { id: 'humor', label: '😄 Humor' },
    { id: 'kindness', label: '💚 Kindness' },
    { id: 'optimism', label: '☀️ Optimism' },
    { id: 'loyalty', label: '🤝 Loyalty' },
    { id: 'sarcasm', label: '😏 Sarcasm' },
    { id: 'adventurous', label: '🚀 Adventurous' },
    { id: 'thoughtful', label: '🧠 Thoughtful' },
    { id: 'energetic', label: '⚡ Energetic' },
    { id: 'calm', label: '🧘 Calm' },
    { id: 'ambitious', label: '🎯 Ambitious' },
    { id: 'creative', label: '🎨 Creative' },
    { id: 'independent', label: '🦅 Independent' },
];

interface Phase4QualitiesProps {
    selectedQualities: string[];
    onSelect: (qualities: string[]) => void;
    isDark: boolean;
}

export function Phase4Qualities({
    selectedQualities,
    onSelect,
    isDark,
}: Phase4QualitiesProps) {
    const { colors } = useTheme();

    const toggleQuality = (qualityId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newQualities = selectedQualities.includes(qualityId)
            ? selectedQualities.filter(q => q !== qualityId)
            : [...selectedQualities, qualityId];
        onSelect(newQualities);
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View entering={FadeIn}>
                <Text style={[styles.title, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                    What qualities do you value?
                </Text>
                <Text
                    style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                >
                    Select up to 5 qualities that describe you best
                </Text>
            </Animated.View>

            {/* Qualities Grid */}
            <View style={styles.gridContainer}>
                {QUALITIES.map((quality, index) => {
                    const isSelected = selectedQualities.includes(quality.id);
                    const isDisabled =
                        selectedQualities.length >= 5 && !isSelected;

                    return (
                        <Animated.View
                            key={quality.id}
                            entering={FadeIn.delay(index * 30)}
                            style={styles.qualityWrapper}
                        >
                            <Pressable
                                style={[
                                    styles.qualityButton,
                                    {
                                        backgroundColor: isSelected
                                            ? '#ec4899'
                                            : isDark
                                            ? 'rgba(255, 255, 255, 0.06)'
                                            : 'rgba(0, 0, 0, 0.04)',
                                        opacity: isDisabled ? 0.5 : 1,
                                    },
                                ]}
                                onPress={() => toggleQuality(quality.id)}
                                disabled={isDisabled}
                            >
                                <Text
                                    style={[
                                        styles.qualityText,
                                        {
                                            color: isSelected
                                                ? '#fff'
                                                : isDark
                                                ? '#fff'
                                                : '#1a1a2e',
                                        },
                                    ]}
                                >
                                    {quality.label}
                                </Text>
                                {isSelected && (
                                    <Text style={styles.checkmark}>✓</Text>
                                )}
                            </Pressable>
                        </Animated.View>
                    );
                })}
            </View>

            {/* Selected count */}
            <View style={styles.countContainer}>
                <Text
                    style={[
                        styles.countText,
                        {
                            color:
                                selectedQualities.length === 0
                                    ? isDark
                                        ? '#64748b'
                                        : '#9ca3af'
                                    : isDark
                                    ? '#10b981'
                                    : '#059669',
                        },
                    ]}
                >
                    {selectedQualities.length} of 5 selected
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    contentContainer: {
        paddingVertical: 30,
        paddingBottom: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 15,
        marginBottom: 28,
        lineHeight: 22,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    qualityWrapper: {
        width: '48.5%',
    },
    qualityButton: {
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 64,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    qualityText: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    checkmark: {
        marginTop: 4,
        fontSize: 16,
        fontWeight: '700',
    },
    countContainer: {
        alignItems: 'center',
        marginTop: 20,
    },
    countText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
