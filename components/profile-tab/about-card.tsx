import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface AboutCardProps {
    bio: string;
    aboutMe?: string;
    lookingFor?: string;
    favoriteVibe?: string;
    perfectDateIdea?: string;
}

export function AboutCard({
    bio,
    aboutMe,
    lookingFor,
    favoriteVibe,
    perfectDateIdea,
}: AboutCardProps) {
    const { colors } = useTheme();

    return (
        <Animated.View entering={FadeInDown.duration(280)} style={styles.section}>
            <Text style={[styles.label, { color: colors.mutedForeground }]}>About</Text>
            <Text style={[styles.bio, { color: colors.foreground }]}>
                {bio || 'Add a short bio so matches know what you are about.'}
            </Text>
            {aboutMe && aboutMe !== bio && (
                <Text variant="muted" style={{ color: colors.mutedForeground, marginTop: SPACING.compact }}>
                    {aboutMe}
                </Text>
            )}
            {(lookingFor || favoriteVibe || perfectDateIdea) && (
                <View style={styles.details}>
                    {lookingFor && <DetailRow label="Looking for" value={lookingFor} />}
                    {favoriteVibe && <DetailRow label="Favorite vibe" value={favoriteVibe} />}
                    {perfectDateIdea && <DetailRow label="Perfect date" value={perfectDateIdea} />}
                </View>
            )}
        </Animated.View>
    );
}

function DetailRow({ label, value }: { label: string; value: string }) {
    const { colors } = useTheme();
    return (
        <View style={styles.detailRow}>
            <Text variant="caption" style={{ color: colors.mutedForeground }}>
                {label}
            </Text>
            <Text style={[styles.detailValue, { color: colors.foreground }]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.section,
    },
    label: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
        marginBottom: SPACING.tight,
    },
    bio: {
        ...TYPOGRAPHY.body,
    },
    details: {
        marginTop: SPACING.compact,
        gap: SPACING.compact,
    },
    detailRow: {
        gap: SPACING.micro,
    },
    detailValue: {
        ...TYPOGRAPHY.callout,
        fontWeight: '500',
    },
});
