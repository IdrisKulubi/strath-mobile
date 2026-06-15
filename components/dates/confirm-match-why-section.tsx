import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import {
    getConfirmMatchWhyBullets,
    type ConfirmMatchWhyBulletIcon,
} from '@/lib/confirmation-copy';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

const ICON_MAP: Record<ConfirmMatchWhyBulletIcon, keyof typeof Ionicons.glyphMap> = {
    'shield-checkmark': 'shield-checkmark-outline',
    heart: 'heart-outline',
    refresh: 'refresh-outline',
};

export interface ConfirmMatchWhySectionProps {
    partnerFirstName: string;
    layout?: 'inline' | 'modal';
    variant?: 'card' | 'flat';
}

export function ConfirmMatchWhySection({
    partnerFirstName,
    layout = 'modal',
    variant = 'card',
}: ConfirmMatchWhySectionProps) {
    const { colors, isDark } = useTheme();
    const isModal = layout === 'modal';
    const isFlat = variant === 'flat';
    const bullets = getConfirmMatchWhyBullets(partnerFirstName);
    const tint = isDark ? 'rgba(217, 74, 143, 0.08)' : 'rgba(184, 50, 122, 0.05)';
    const borderTint = isDark ? 'rgba(217, 74, 143, 0.2)' : 'rgba(184, 50, 122, 0.14)';

    return (
        <View
            accessibilityRole="summary"
            accessibilityLabel="Why StrathSpace asks you to confirm"
            style={[
                styles.wrap,
                isFlat ? styles.wrapFlat : { backgroundColor: tint, borderColor: borderTint },
            ]}
        >
            <RNText style={[styles.heading, { color: colors.foreground }]}>
                Why this step?
            </RNText>
            <View style={styles.list}>
                {bullets.map((bullet) => (
                    <View
                        key={bullet.title}
                        style={[styles.row, isModal ? styles.rowModal : styles.rowInline]}
                    >
                        <View
                            style={[
                                styles.iconWrap,
                                isFlat ? styles.iconWrapFlat : { backgroundColor: colors.muted },
                            ]}
                        >
                            <Ionicons
                                name={ICON_MAP[bullet.icon]}
                                size={18}
                                color={colors.primary}
                            />
                        </View>
                        <View style={styles.textCol}>
                            <RNText style={[styles.title, { color: colors.foreground }]}>
                                {bullet.title}
                            </RNText>
                            <RNText style={[styles.body, { color: colors.mutedForeground }]}>
                                {bullet.body}
                            </RNText>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%',
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact + 2,
        gap: SPACING.compact,
    },
    wrapFlat: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: SPACING.tight,
        paddingVertical: 0,
        gap: SPACING.micro,
    },
    heading: {
        ...TYPOGRAPHY.callout,
        fontWeight: '700',
        textAlign: 'left',
    },
    list: {
        gap: SPACING.tight,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.compact,
    },
    rowModal: {
        alignItems: 'flex-start',
    },
    rowInline: {
        alignItems: 'flex-start',
    },
    iconWrap: {
        width: 32,
        height: 32,
        borderRadius: RADIUS.sm,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    iconWrapFlat: {
        width: 28,
        height: 28,
        backgroundColor: 'transparent',
        marginTop: 0,
    },
    textCol: {
        flex: 1,
        gap: 2,
    },
    title: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        lineHeight: 18,
    },
    body: {
        ...TYPOGRAPHY.caption,
        lineHeight: 18,
    },
});
