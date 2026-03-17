import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';
import { CompletionHalo } from '@/components/profile/completion-halo';

interface ProfileHeroCardProps {
    profilePhoto?: string | null;
    firstName: string;
    lastName: string;
    age?: number;
    course?: string;
    yearOfStudy?: number;
    university?: string;
    personalityType?: string;
    zodiacSign?: string;
    completionPercentage: number;
    vibeLine?: string;
    onSettingsPress?: () => void;
}

function buildVibeLine(props: {
    course?: string;
    personalityType?: string;
    zodiacSign?: string;
}): string {
    const parts: string[] = [];
    if (props.course) parts.push(props.course);
    if (props.personalityType) parts.push(props.personalityType);
    if (props.zodiacSign) parts.push(props.zodiacSign);
    return parts.slice(0, 3).join(' • ') || '';
}

export function ProfileHeroCard({
    profilePhoto,
    firstName,
    lastName,
    age,
    course,
    yearOfStudy,
    university,
    completionPercentage,
    personalityType,
    zodiacSign,
    vibeLine,
    onSettingsPress,
}: ProfileHeroCardProps) {
    const { colors, isDark } = useTheme();
    const displayVibe = vibeLine || buildVibeLine({ course, personalityType, zodiacSign });

    return (
        <Animated.View
            entering={FadeInDown.delay(100).springify().damping(14)}
            style={styles.container}
        >
            {/* Settings button */}
            {onSettingsPress && (
                <Pressable
                    onPress={onSettingsPress}
                    style={[
                        styles.settingsBtn,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
                        },
                    ]}
                >
                    <Ionicons name="settings-outline" size={22} color={colors.foreground} />
                </Pressable>
            )}

            {/* Avatar with gradient ring */}
            <View style={styles.avatarWrap}>
                {isDark && (
                    <LinearGradient
                        colors={['#e91e8c', '#c026d3', '#e91e8c']}
                        style={styles.gradientRing}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    />
                )}
                <CompletionHalo percentage={completionPercentage} radius={72} strokeWidth={5}>
                    <CachedImage
                        uri={profilePhoto}
                        style={styles.avatar}
                        fallbackType="avatar"
                    />
                </CompletionHalo>
            </View>

            {/* Identity */}
            <View style={styles.identity}>
                <View style={styles.nameWrap}>
                    <Text style={[styles.name, { color: colors.foreground }]}>
                        {firstName} {lastName}
                        {age != null ? `, ${age}` : ''}
                    </Text>
                </View>
                {(course || yearOfStudy) && (
                    <Text style={[styles.meta, { color: colors.mutedForeground }]}>
                        {course}
                        {yearOfStudy != null ? ` • Year ${yearOfStudy}` : ''}
                    </Text>
                )}
                {university && (
                    <LinearGradient
                        colors={isDark ? ['rgba(233,30,140,0.4)', 'rgba(192,38,211,0.3)'] : ['rgba(233,30,140,0.15)', 'rgba(192,38,211,0.12)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.uniPill}
                    >
                        <Text style={[styles.uniText, { color: isDark ? '#fff' : colors.primary }]}>
                            {university}
                        </Text>
                    </LinearGradient>
                )}
                {displayVibe && (
                    <Text style={[styles.vibeLine, { color: colors.mutedForeground }]}>
                        {displayVibe}
                    </Text>
                )}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 28,
        paddingHorizontal: 24,
    },
    settingsBtn: {
        position: 'absolute',
        top: 48,
        right: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    avatarWrap: {
        position: 'relative',
    },
    gradientRing: {
        position: 'absolute',
        top: -10,
        left: -10,
        right: -10,
        bottom: -10,
        borderRadius: 90,
        opacity: 0.35,
    },
    avatar: {
        width: 144,
        height: 144,
        borderRadius: 72,
    },
    identity: {
        alignItems: 'center',
        marginTop: 20,
        gap: 6,
        width: '100%',
        paddingHorizontal: 8,
    },
    nameWrap: {
        width: '100%',
        alignItems: 'center',
    },
    name: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.6,
        lineHeight: 38,
        textAlign: 'center',
    },
    meta: {
        fontSize: 15,
        fontWeight: '500',
    },
    uniPill: {
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 999,
        marginTop: 2,
    },
    uniText: {
        fontSize: 13,
        fontWeight: '700',
    },
    vibeLine: {
        fontSize: 13,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 4,
        maxWidth: 280,
    },
});
