import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface ProfileContentSectionProps {
    title: string;
    children: React.ReactNode;
    style?: ViewStyle;
}

export function ProfileContentSection({ title, children, style }: ProfileContentSectionProps) {
    const { colors } = useTheme();

    return (
        <Animated.View entering={FadeInDown.duration(280)} style={[styles.section, style]}>
            <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
            {children}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    section: {
        paddingHorizontal: SPACING.screenX,
        paddingBottom: SPACING.section,
        gap: SPACING.compact,
    },
    title: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
    },
});
