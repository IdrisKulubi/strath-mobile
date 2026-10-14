import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

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
    return parts.slice(0, 3).join(' · ') || '';
}

export function ProfileHeroCard({
    profilePhoto,
    firstName,
    lastName,
    age,
    course,
    yearOfStudy,
    university,
    personalityType,
    zodiacSign,
    vibeLine,
    onSettingsPress,
}: ProfileHeroCardProps) {
    const { colors } = useTheme();
    const displayVibe = vibeLine || buildVibeLine({ course, personalityType, zodiacSign });

    return (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.container}>
            <View style={styles.topRow}>
                <Text style={[styles.screenTitle, { color: colors.foreground }]}>Profile</Text>
                {onSettingsPress && (
                    <Pressable
                        onPress={onSettingsPress}
                        accessibilityRole="button"
                        accessibilityLabel="Settings"
                        style={({ pressed }) => [
                            styles.settingsBtn,
                            { backgroundColor: colors.muted, opacity: pressed ? 0.72 : 1 },
                        ]}
                    >
                        <Ionicons name="settings-outline" size={21} color={colors.foreground} />
                    </Pressable>
                )}
            </View>

            <View style={styles.profileRow}>
                <CachedImage
                    uri={profilePhoto}
                    style={[styles.avatar, { borderColor: colors.border }]}
                    fallbackType="avatar"
                />
                <View style={styles.identity}>
                    <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
                        {firstName} {lastName}
                        {age != null ? `, ${age}` : ''}
                    </Text>
                    {(course || yearOfStudy != null) && (
                        <Text variant="muted" style={{ color: colors.mutedForeground }} numberOfLines={1}>
                            {course}
                            {course && yearOfStudy != null ? ' · ' : ''}
                            {yearOfStudy != null ? `Year ${yearOfStudy}` : ''}
                        </Text>
                    )}
                    {university ? (
                        <Text variant="caption" style={{ color: colors.mutedForeground }} numberOfLines={1}>
                            {university}
                        </Text>
                    ) : displayVibe ? (
                        <Text variant="caption" style={{ color: colors.mutedForeground }} numberOfLines={1}>
                            {displayVibe}
                        </Text>
                    ) : null}
                </View>
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.tight,
        paddingBottom: SPACING.compact,
    },
    topRow: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: SPACING.compact,
    },
    screenTitle: { ...TYPOGRAPHY.title, fontWeight: '700' },
    settingsBtn: {
        width: 44,
        height: 44,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    profileRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.compact },
    avatar: { width: 72, height: 72, borderRadius: 36, borderWidth: 1 },
    identity: { flex: 1, minWidth: 0, gap: 2 },
    name: { ...TYPOGRAPHY.title, fontWeight: '700' },
});
