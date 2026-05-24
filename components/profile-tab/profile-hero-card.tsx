import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { SPACING, TYPOGRAPHY, RADIUS } from '@/lib/design-tokens';
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
    completionPercentage,
    personalityType,
    zodiacSign,
    vibeLine,
    onSettingsPress,
}: ProfileHeroCardProps) {
    const { colors } = useTheme();
    const displayVibe = vibeLine || buildVibeLine({ course, personalityType, zodiacSign });

    return (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.container}>
            {onSettingsPress && (
                <Pressable
                    onPress={onSettingsPress}
                    accessibilityLabel="Settings"
                    style={[styles.settingsBtn, { backgroundColor: colors.muted }]}
                >
                    <Ionicons name="settings-outline" size={22} color={colors.foreground} />
                </Pressable>
            )}

            <View style={styles.avatarWrap}>
                <CompletionHalo percentage={completionPercentage} radius={72} strokeWidth={3}>
                    <CachedImage
                        uri={profilePhoto}
                        style={[styles.avatar, { borderColor: colors.border }]}
                        fallbackType="avatar"
                    />
                </CompletionHalo>
            </View>

            <View style={styles.identity}>
                <Text style={[styles.name, { color: colors.foreground }]}>
                    {firstName} {lastName}
                    {age != null ? `, ${age}` : ''}
                </Text>
                {(course || yearOfStudy != null) && (
                    <Text variant="muted" style={{ color: colors.mutedForeground }}>
                        {course}
                        {yearOfStudy != null ? ` · Year ${yearOfStudy}` : ''}
                    </Text>
                )}
                {university && (
                    <View style={[styles.uniPill, { borderColor: colors.border, backgroundColor: colors.muted }]}>
                        <Text variant="label" style={{ color: colors.foreground }}>
                            {university}
                        </Text>
                    </View>
                )}
                {displayVibe ? (
                    <Text variant="caption" style={{ color: colors.mutedForeground, textAlign: 'center' }}>
                        {displayVibe}
                    </Text>
                ) : null}
            </View>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: SPACING.comfortable,
        paddingBottom: SPACING.section,
        paddingHorizontal: SPACING.screenX,
    },
    settingsBtn: {
        position: 'absolute',
        top: SPACING.comfortable,
        right: SPACING.screenX,
        width: 44,
        height: 44,
        borderRadius: RADIUS.full,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    avatarWrap: {
        position: 'relative',
    },
    avatar: {
        width: 144,
        height: 144,
        borderRadius: 72,
        borderWidth: 1,
    },
    identity: {
        alignItems: 'center',
        marginTop: SPACING.comfortable,
        gap: SPACING.tight,
        width: '100%',
        maxWidth: 320,
    },
    name: {
        ...TYPOGRAPHY.display,
        textAlign: 'center',
    },
    uniPill: {
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.micro + 2,
        borderRadius: RADIUS.full,
        borderWidth: 1,
        marginTop: SPACING.micro,
    },
});
