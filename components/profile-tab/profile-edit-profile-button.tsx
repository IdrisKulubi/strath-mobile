import React, { useCallback } from 'react';
import {
    Platform,
    Pressable,
    StyleSheet,
    Text as RNText,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { PencilSimple } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface ProfileEditProfileButtonProps {
    onPress: () => void;
    layout?: 'inline' | 'floating';
    style?: StyleProp<ViewStyle>;
}

export function ProfileEditProfileButton({
    onPress,
    layout = 'inline',
    style,
}: ProfileEditProfileButtonProps) {
    const { colors, isDark } = useTheme();

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
    }, [onPress]);

    const isFloating = layout === 'floating';

    return (
        <Pressable
            onPress={handlePress}
            accessibilityRole="button"
            accessibilityLabel="Edit profile"
            style={({ pressed }) => [
                styles.base,
                isFloating ? styles.floating : styles.inline,
                {
                    borderColor: isDark ? colors.border : colors.primary,
                    backgroundColor: pressed
                        ? isDark
                          ? colors.muted
                          : 'rgba(217, 74, 143, 0.08)'
                        : colors.card,
                },
                !isDark && !pressed ? styles.lightElevation : null,
                style,
            ]}
        >
            <View style={[styles.iconWrap, { backgroundColor: isDark ? colors.muted : 'rgba(217, 74, 143, 0.12)' }]}>
                <PencilSimple size={20} color={colors.primary} weight="bold" />
            </View>
            <RNText style={[styles.label, { color: colors.foreground }]}>Edit profile</RNText>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    base: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.tight,
        borderWidth: 1,
        minHeight: 48,
    },
    inline: {
        alignSelf: 'stretch',
        marginHorizontal: SPACING.screenX,
        marginBottom: SPACING.section,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
        borderRadius: RADIUS.md,
    },
    floating: {
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
        borderRadius: RADIUS.full,
        minWidth: 168,
    },
    lightElevation: {
        ...Platform.select({
            ios: {
                shadowColor: '#1C1524',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.08,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
            default: {},
        }),
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
    },
    label: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
});
