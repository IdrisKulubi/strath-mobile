import React from 'react';
import { StyleSheet, View } from 'react-native';
import type { IconProps } from 'phosphor-react-native';

import { Text } from '@/components/ui/text';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

export interface ProfileDetailItem {
    label: string;
    value: string;
    Icon: React.ComponentType<IconProps>;
    fullWidth?: boolean;
}

interface ProfileDetailsGridProps {
    items: ProfileDetailItem[];
}

export function ProfileDetailsGrid({ items }: ProfileDetailsGridProps) {
    const { colors, isDark } = useTheme();

    if (items.length === 0) return null;

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
            <View style={styles.grid}>
                {items.map((item, index) => (
                    <View
                        key={`detail-${index}-${item.label}`}
                        style={[styles.cell, item.fullWidth && styles.cellFull]}
                    >
                        <View style={[styles.iconWrap, { backgroundColor: colors.muted }]}>
                            <item.Icon size={18} color={colors.primary} weight="duotone" />
                        </View>
                        <View style={styles.cellCopy}>
                            <Text variant="caption" style={{ color: colors.mutedForeground }}>
                                {item.label}
                            </Text>
                            <Text
                                style={[styles.value, { color: colors.foreground }]}
                                numberOfLines={item.fullWidth ? 3 : 2}
                            >
                                {item.value}
                            </Text>
                        </View>
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.lg,
        borderWidth: 1,
        padding: SPACING.base,
    },
    cardShadowLight: {
        shadowColor: '#1C1524',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: SPACING.compact,
    },
    cell: {
        width: '48%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.tight,
        paddingVertical: SPACING.tight,
    },
    cellFull: {
        width: '100%',
    },
    iconWrap: {
        width: 36,
        height: 36,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cellCopy: {
        flex: 1,
        gap: SPACING.micro,
    },
    value: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
});
