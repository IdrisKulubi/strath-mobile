import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Text } from '@/components/ui/text';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

interface ProfileSocialsCardProps {
    instagram?: string | null;
    spotify?: string | null;
    snapchat?: string | null;
}

export function ProfileSocialsCard({ instagram, spotify, snapchat }: ProfileSocialsCardProps) {
    const { colors, isDark } = useTheme();

    const rows: {
        icon: keyof typeof Ionicons.glyphMap;
        iconColor: string;
        label: string;
        value: string;
    }[] = [];
    if (instagram) {
        rows.push({
            icon: 'logo-instagram',
            iconColor: colors.primary,
            label: 'Instagram',
            value: `@${instagram}`,
        });
    }
    if (spotify) {
        rows.push({
            icon: 'musical-notes',
            iconColor: colors.foreground,
            label: 'Spotify',
            value: 'Connected',
        });
    }
    if (snapchat) {
        rows.push({
            icon: 'logo-snapchat',
            iconColor: colors.foreground,
            label: 'Snapchat',
            value: `@${snapchat}`,
        });
    }

    const hasAny = rows.length > 0;

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                },
                !isDark && styles.cardShadowLight,
            ]}
        >
            {hasAny ? (
                <View style={styles.list}>
                    {rows.map((row, index) => (
                        <SocialRow
                            key={row.label}
                            icon={row.icon}
                            iconColor={row.iconColor}
                            label={row.label}
                            value={row.value}
                            showDivider={index < rows.length - 1}
                        />
                    ))}
                </View>
            ) : (
                <Text variant="muted" style={{ color: colors.mutedForeground }}>
                    Add socials in Edit profile so matches can find you elsewhere.
                </Text>
            )}
        </View>
    );
}

function SocialRow({
    icon,
    iconColor,
    label,
    value,
    showDivider,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    iconColor: string;
    label: string;
    value: string;
    showDivider?: boolean;
}) {
    const { colors } = useTheme();

    return (
        <View
            style={[
                styles.row,
                showDivider && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: colors.border,
                },
            ]}
        >
            <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
                <Ionicons name={icon} size={20} color={iconColor} />
            </View>
            <View style={styles.rowCopy}>
                <Text variant="caption" style={{ color: colors.mutedForeground }}>
                    {label}
                </Text>
                <Text style={[styles.value, { color: colors.foreground }]}>{value}</Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.compact,
    },
    cardShadowLight: {
        shadowColor: '#1C1524',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    list: {
        gap: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
        paddingVertical: SPACING.compact,
    },
    iconWrap: {
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rowCopy: {
        flex: 1,
        gap: SPACING.micro,
    },
    value: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
});
