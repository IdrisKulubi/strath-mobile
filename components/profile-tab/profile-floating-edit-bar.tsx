import React, { useCallback } from 'react';
import { Platform, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

/** Total height reserved above the tab bar (bar + gap) */
export const PROFILE_FLOATING_BAR_HEIGHT = 72;

interface ProfileFloatingEditBarProps {
    onEditPress: () => void;
}

export function ProfileFloatingEditBar({ onEditPress }: ProfileFloatingEditBarProps) {
    const { colors, isDark } = useTheme();
    const tabBarHeight = useBottomTabBarHeight();

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onEditPress();
    }, [onEditPress]);

    const labelColor = colors.foreground;
    const iconColor = colors.primary;

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.host,
                { bottom: tabBarHeight },
            ]}
        >
            <View
                style={[
                    styles.barBackdrop,
                    {
                        backgroundColor: colors.background,
                        borderTopColor: colors.border,
                    },
                ]}
            >
            <Pressable
                onPress={handlePress}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                style={({ pressed }) => [
                    styles.btn,
                    {
                        backgroundColor: pressed
                            ? (isDark ? 'rgba(255, 255, 255, 0.08)' : colors.muted)
                            : 'transparent',
                        borderWidth: 1,
                        borderColor: isDark ? colors.border : 'transparent',
                    },
                ]}
            >
                <Ionicons name="pencil" size={20} color={iconColor} />
                <RNText style={[styles.btnText, { color: labelColor }]}>Edit profile</RNText>
            </Pressable>
            </View>
        </View>
    );
}

export function profileScrollBottomInset(tabBarHeight?: number): number {
    const tab = tabBarHeight ?? (Platform.OS === 'ios' ? 94 : 74);
    return tab + PROFILE_FLOATING_BAR_HEIGHT + SPACING.base;
}

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 30,
        elevation: 12,
    },
    barBackdrop: {
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.tight,
        paddingBottom: SPACING.micro,
    },
    btn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.tight,
        minHeight: 48,
        width: '100%',
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.section,
        paddingVertical: SPACING.compact,
    },
    btnText: {
        ...TYPOGRAPHY.headline,
        fontWeight: '600',
    },
});
