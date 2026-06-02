import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import { SPACING } from '@/lib/design-tokens';

import { ProfileEditProfileButton } from './profile-edit-profile-button';

/** Space reserved above tab bar for the floating edit control */
export const PROFILE_FLOATING_BAR_HEIGHT = 56;

interface ProfileFloatingEditBarProps {
    onEditPress: () => void;
}

export function ProfileFloatingEditBar({ onEditPress }: ProfileFloatingEditBarProps) {
    const tabBarHeight = useBottomTabBarHeight();

    return (
        <View pointerEvents="box-none" style={[styles.host, { bottom: tabBarHeight }]}>
            <ProfileEditProfileButton onPress={onEditPress} layout="floating" />
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
        paddingHorizontal: SPACING.screenX,
    },
});
