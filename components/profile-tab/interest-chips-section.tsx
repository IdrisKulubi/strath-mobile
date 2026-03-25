import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { QualityBadge } from '@/components/ui/quality-badge';

interface InterestChipsSectionProps {
    interests?: string[];
    qualities?: string[];
    zodiacSign?: string;
    personalityType?: string;
    loveLanguage?: string;
    lifestyleTags?: string[];
    isDark?: boolean;
}

const CHIP_COLORS = [
    { start: '#ec4899', end: '#e91e8c' },
    { start: '#8b5cf6', end: '#7c3aed' },
    { start: '#06b6d4', end: '#0891b2' },
    { start: '#10b981', end: '#059669' },
    { start: '#f59e0b', end: '#d97706' },
];

export function InterestChipsSection({
    interests,
    qualities,
    zodiacSign,
    personalityType,
    loveLanguage,
    lifestyleTags,
    isDark = false,
}: InterestChipsSectionProps) {
    const { colors } = useTheme();
    const safeInterests = interests ?? [];
    const safeQualities = qualities ?? [];
    const safeLifestyleTags = lifestyleTags ?? [];

    const personalityChips = [zodiacSign, personalityType, loveLanguage].filter(Boolean) as string[];
    const allChips = [...personalityChips, ...safeInterests, ...safeLifestyleTags];
    const hasContent = allChips.length > 0 || safeQualities.length > 0;

    if (!hasContent) return null;

    return (
        <Animated.View
            entering={FadeInDown.delay(320).springify().damping(14)}
            style={[
                styles.card,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff',
                    borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
                !isDark && styles.cardShadow,
            ]}
        >
            <View style={styles.header}>
                <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(139,92,246,0.2)' : 'rgba(139,92,246,0.1)' }]}>
                    <Ionicons name="sparkles" size={18} color="#8b5cf6" />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>Interests & Vibe</Text>
            </View>
            <View style={styles.chipsWrap}>
                {zodiacSign && (
                    <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(233,30,140,0.2)' : 'rgba(233,30,140,0.1)' }]}>
                        <Text style={[styles.pillText, { color: colors.primary }]}>✨ {zodiacSign}</Text>
                    </View>
                )}
                {personalityType && (
                    <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(6,182,212,0.2)' : 'rgba(6,182,212,0.1)' }]}>
                        <Text style={[styles.pillText, { color: isDark ? '#22d3ee' : '#0891b2' }]}>🧠 {personalityType}</Text>
                    </View>
                )}
                {loveLanguage && (
                    <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(244,63,94,0.2)' : 'rgba(244,63,94,0.1)' }]}>
                        <Text style={[styles.pillText, { color: isDark ? '#fda4af' : '#e11d48' }]}>💕 {loveLanguage}</Text>
                    </View>
                )}
                {safeInterests.map((interest, i) => (
                    <View
                        key={`i-${i}`}
                        style={[
                            styles.pill,
                            { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)' },
                        ]}
                    >
                        <Text style={[styles.pillText, { color: colors.foreground }]}>{interest}</Text>
                    </View>
                ))}
                {safeLifestyleTags.map((tag, i) => (
                    <View
                        key={`l-${i}`}
                        style={[
                            styles.pill,
                            { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.08)' },
                        ]}
                    >
                        <Text style={[styles.pillText, { color: isDark ? '#34d399' : '#059669' }]}>{tag}</Text>
                    </View>
                ))}
            </View>
            {safeQualities.length > 0 && (
                <View style={styles.qualitiesWrap}>
                    {safeQualities.map((q, i) => (
                        <QualityBadge key={i} quality={q} isDark={isDark} />
                    ))}
                </View>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    card: {
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        borderWidth: 1,
        padding: 20,
    },
    cardShadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    chipsWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pill: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
    },
    pillText: {
        fontSize: 14,
        fontWeight: '600',
    },
    qualitiesWrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginTop: 14,
    },
});
