import React, { useCallback } from 'react';
import { Pressable, StyleSheet, Text as RNText, View, Platform } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

/** Space reserved above tab bar for the floating pill */
export const PROFILE_FLOATING_BAR_HEIGHT = 48;

interface ProfileFloatingEditBarProps {
    onEditPress: () => void;
}

export function ProfileFloatingEditBar({ onEditPress }: ProfileFloatingEditBarProps) {
    const { colors, isDark } = useTheme();
    const tabBarHeight = useBottomTabBarHeight();

    const handlePress = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onEditPress();
    }, [onEditPress]);

    return (
        <View
            pointerEvents="box-none"
            style={[styles.host, { bottom: tabBarHeight }]}
        >
            <Pressable
                onPress={handlePress}
                accessibilityRole="button"
                accessibilityLabel="Edit profile"
                style={({ pressed }) => [
                    styles.pill,
                    {
                        borderColor: colors.border,
                        backgroundColor: pressed
                            ? (isDark ? 'rgba(255, 255, 255, 0.1)' : colors.muted)
                            : isDark
                              ? 'rgba(255, 255, 255, 0.04)'
                              : 'rgba(255, 255, 255, 0.85)',
                    },
                ]}
            >
                <Ionicons name="pencil" size={15} color={colors.primary} />
                <RNText style={[styles.label, { color: colors.foreground }]}>Edit profile</RNText>
            </Pressable>
        </View>
    );
}

export function profileScrollBottomInset(tabBarHeight?: number): number {
    const tab = tabBarHeight ?? (Platform.OS === 'ios' ? 94 : 74);
    return tab + PROFILE_FLOATING_BAR_HEIGHT + SPACING.tight;
}

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        left: 0,
        right: 0,
        zIndex: 30,
        alignItems: 'center',
        paddingBottom: SPACING.compact,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingHorizontal: SPACING.compact + 2,
        paddingVertical: SPACING.tight,
        borderRadius: RADIUS.full,
        borderWidth: StyleSheet.hairlineWidth,
        minHeight: 36,
    },
    label: {
        ...TYPOGRAPHY.label,
        fontWeight: '600',
    },
});
