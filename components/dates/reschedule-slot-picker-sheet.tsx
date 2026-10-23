import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useRescheduleOptions } from '@/hooks/use-reschedule';
import type { RescheduleSlotOption } from '@/lib/reschedule-types';
import { MEETUP_WINDOWS_COPY } from '@/lib/meetup-slot';
import { Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export interface RescheduleSlotPickerSheetProps {
    visible: boolean;
    mutualMatchId: string;
    title?: string;
    subtitle?: string;
    confirmLabel?: string;
    onClose: () => void;
    onSelect: (option: RescheduleSlotOption) => void;
}

export function RescheduleSlotPickerSheet({
    visible,
    mutualMatchId,
    title = 'Choose a new time',
    subtitle = MEETUP_WINDOWS_COPY,
    confirmLabel = 'Request change',
    onClose,
    onSelect,
}: RescheduleSlotPickerSheetProps) {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const { data, isLoading, isError, refetch } = useRescheduleOptions(mutualMatchId, visible);
    const [selected, setSelected] = useState<RescheduleSlotOption | null>(null);

    const t = isDark ? Palette.dark : Palette.light;

    useEffect(() => {
        if (!visible) {
            setSelected(null);
        }
    }, [visible]);

    const handleConfirm = () => {
        if (!selected) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onSelect(selected);
    };

    return (
        <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
            <Pressable style={[styles.backdrop, { backgroundColor: isDark ? 'rgba(15,12,20,0.74)' : 'rgba(28,21,36,0.42)' }]} onPress={onClose} />
            <View
                style={[
                    styles.sheet,
                    {
                        backgroundColor: t.card,
                        borderColor: t.border,
                        paddingBottom: Math.max(insets.bottom, SPACING.base),
                    },
                ]}
            >
                <View style={styles.handle} />
                <Text style={[styles.title, { color: t.foreground }]}>{title}</Text>
                <Text style={[styles.subtitle, { color: t.mutedForeground }]}>{subtitle}</Text>

                {isLoading ? (
                    <ActivityIndicator color={t.primary} style={styles.loader} />
                ) : isError ? (
                    <TouchableOpacity onPress={() => refetch()} style={styles.retry}>
                        <Text style={{ color: t.primary }}>Could not load times. Tap to retry.</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.options}>
                        {(data?.options ?? []).map((option) => {
                            const isSelected = selected?.scheduledAt === option.scheduledAt;
                            return (
                                <Pressable
                                    key={option.scheduledAt}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        setSelected(option);
                                    }}
                                    style={[
                                        styles.optionRow,
                                        {
                                            borderColor: isSelected ? t.primary : t.border,
                                            backgroundColor: isSelected
                                                ? isDark
                                                    ? 'rgba(217, 74, 143, 0.14)'
                                                    : 'rgba(184, 50, 122, 0.08)'
                                                : 'transparent',
                                        },
                                    ]}
                                >
                                    <Ionicons
                                        name="calendar-outline"
                                        size={18}
                                        color={isSelected ? t.primary : t.mutedForeground}
                                    />
                                    <Text style={[styles.optionLabel, { color: t.foreground }]}>
                                        {option.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                )}

                <TouchableOpacity
                    disabled={!selected}
                    onPress={handleConfirm}
                    activeOpacity={0.88}
                    style={[
                        styles.primaryBtn,
                        {
                            backgroundColor: t.primary,
                            opacity: selected ? 1 : 0.45,
                        },
                    ]}
                >
                    <Text style={styles.primaryBtnLabel}>{confirmLabel}</Text>
                </TouchableOpacity>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
    },
    sheet: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
        gap: SPACING.compact,
    },
    handle: {
        alignSelf: 'center',
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(128,128,128,0.35)',
        marginBottom: SPACING.tight,
    },
    title: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
    },
    subtitle: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
    },
    loader: {
        marginVertical: SPACING.section,
    },
    retry: {
        paddingVertical: SPACING.section,
        alignItems: 'center',
    },
    options: {
        gap: SPACING.tight,
        marginTop: SPACING.compact,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
        paddingVertical: SPACING.compact,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
    },
    optionLabel: {
        ...TYPOGRAPHY.body,
        fontWeight: '600',
        flex: 1,
    },
    primaryBtn: {
        minHeight: 52,
        borderRadius: RADIUS.lg,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: SPACING.compact,
    },
    primaryBtnLabel: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
});
