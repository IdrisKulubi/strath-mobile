import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

interface AboutCardProps {
    bio: string;
    aboutMe?: string;
    lookingFor?: string;
    favoriteVibe?: string;
    perfectDateIdea?: string;
}

export function AboutCard({ bio, aboutMe, lookingFor, favoriteVibe, perfectDateIdea }: AboutCardProps) {
    const { colors, isDark } = useTheme();

    return (
        <Animated.View
            entering={FadeInDown.delay(280).springify().damping(14)}
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
                <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(233,30,140,0.2)' : 'rgba(233,30,140,0.1)' }]}>
                    <Ionicons name="person" size={18} color={colors.primary} />
                </View>
                <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>About</Text>
            </View>
            <Text style={[styles.bio, { color: colors.foreground }]}>
                {bio || 'No bio yet. Tap Edit Profile to add one.'}
            </Text>
            {aboutMe && aboutMe !== bio && (
                <Text style={[styles.aboutMe, { color: colors.mutedForeground }]}>
                    {aboutMe}
                </Text>
            )}
            {(lookingFor || favoriteVibe || perfectDateIdea) && (
                <View style={styles.subBlocks}>
                    {lookingFor && (
                        <View style={[styles.subBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                            <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Looking for</Text>
                            <Text style={[styles.subValue, { color: colors.foreground }]}>{lookingFor}</Text>
                        </View>
                    )}
                    {favoriteVibe && (
                        <View style={[styles.subBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                            <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Favorite vibe</Text>
                            <Text style={[styles.subValue, { color: colors.foreground }]}>{favoriteVibe}</Text>
                        </View>
                    )}
                    {perfectDateIdea && (
                        <View style={[styles.subBlock, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)' }]}>
                            <Text style={[styles.subLabel, { color: colors.mutedForeground }]}>Perfect date idea</Text>
                            <Text style={[styles.subValue, { color: colors.foreground }]}>{perfectDateIdea}</Text>
                        </View>
                    )}
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
    bio: {
        fontSize: 16,
        lineHeight: 24,
        fontWeight: '400',
    },
    aboutMe: {
        fontSize: 14,
        lineHeight: 21,
        marginTop: 12,
    },
    subBlocks: {
        marginTop: 16,
        gap: 10,
    },
    subBlock: {
        padding: 10,
        borderRadius: 12,
        gap: 4,
    },
    subLabel: {
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    subValue: {
        fontSize: 14,
        fontWeight: '500',
    },
});
