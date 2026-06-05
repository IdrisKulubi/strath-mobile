import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import type { MatchHoldCancelReason } from '@/hooks/use-daily-matches';
import { Palette, RADIUS, SPACING } from '@/lib/design-tokens';

const CANCEL_REASONS: {
    id: MatchHoldCancelReason;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
}[] = [
    { id: 'no_longer_interested', label: 'No longer interested', icon: 'heart-dislike-outline' },
    { id: 'scheduling_conflict', label: 'Scheduling conflict', icon: 'calendar-outline' },
    { id: 'safety_concern', label: 'Safety concern', icon: 'shield-outline' },
];

export interface CancelHoldSheetProps {
    visible: boolean;
    partnerName: string;
    isSubmitting: boolean;
    /** Shown when the user already paid the date setup fee */
    paidCreditNote?: string | null;
    onClose: () => void;
    onConfirm: (reason: MatchHoldCancelReason) => void;
}

export function CancelHoldSheet({
    visible,
    partnerName,
    isSubmitting,
    paidCreditNote,
    onClose,
    onConfirm,
}: CancelHoldSheetProps) {
    const { isDark } = useTheme();
    const insets = useSafeAreaInsets();
    const [selected, setSelected] = useState<MatchHoldCancelReason | null>(null);

    const t = isDark ? Palette.dark : Palette.light;

    const c = useMemo(
        () => ({
            backdrop: isDark ? 'rgba(15, 12, 20, 0.74)' : 'rgba(28, 21, 36, 0.42)',
            sheet: t.card,
            border: t.border,
            foreground: t.foreground,
            muted: t.mutedForeground,
            rowSelected: isDark ? 'rgba(217, 74, 143, 0.16)' : 'rgba(184, 50, 122, 0.09)',
            iconBg: isDark ? 'rgba(255,255,255,0.06)' : t.secondary,
            destructive: t.destructive,
            destructiveSoft: isDark ? 'rgba(224, 90, 90, 0.16)' : 'rgba(201, 59, 59, 0.1)',
            primary: t.primary,
            disabledBtn: t.secondary,
        }),
        [isDark, t],
    );

    useEffect(() => {
        if (!visible) {
            setSelected(null);
        }
    }, [visible]);

    const canConfirm = Boolean(selected) && !isSubmitting;

    const handleSelect = (id: MatchHoldCancelReason) => {
        Haptics.selectionAsync();
        setSelected(id);
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={[styles.backdrop, { backgroundColor: c.backdrop }]}>
                <Pressable
                    style={StyleSheet.absoluteFill}
                    onPress={onClose}
                    accessibilityLabel="Dismiss"
                />

                <Animated.View
                    entering={FadeInUp.duration(260)}
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: c.sheet,
                            borderColor: c.border,
                            paddingBottom: Math.max(insets.bottom, SPACING.base),
                        },
                    ]}
                >
                    <View style={[styles.handle, { backgroundColor: c.border }]} />

                    <View style={styles.body}>
                        <Animated.View entering={FadeIn.duration(220)} style={styles.header}>
                            <View style={[styles.headerIcon, { backgroundColor: c.destructiveSoft }]}>
                                <Ionicons name="heart-dislike" size={24} color={c.destructive} />
                            </View>
                            <Text style={[styles.title, { color: c.foreground }]}>
                                Cancel match with {partnerName}?
                            </Text>
                            <Text style={[styles.subtitle, { color: c.muted }]}>
                                You will go back into matching right away. Pick a reason below.
                            </Text>
                            {paidCreditNote ? (
                                <View
                                    style={[
                                        styles.creditNote,
                                        {
                                            backgroundColor: isDark
                                                ? 'rgba(217, 74, 143, 0.12)'
                                                : 'rgba(184, 50, 122, 0.08)',
                                            borderColor: isDark
                                                ? 'rgba(217, 74, 143, 0.25)'
                                                : 'rgba(184, 50, 122, 0.2)',
                                        },
                                    ]}
                                >
                                    <Ionicons name="wallet-outline" size={18} color={c.primary} />
                                    <Text style={[styles.creditNoteText, { color: c.foreground }]}>
                                        {paidCreditNote}
                                    </Text>
                                </View>
                            ) : null}
                        </Animated.View>

                        <Text style={[styles.sectionLabel, { color: c.muted }]}>
                            Why are you cancelling?
                        </Text>

                        <View style={[styles.group, { backgroundColor: c.sheet, borderColor: c.border }]}>
                            {CANCEL_REASONS.map((reason, index) => {
                                const isSelected = selected === reason.id;

                                return (
                                    <View key={reason.id}>
                                        {index > 0 ? (
                                            <View style={[styles.divider, { backgroundColor: c.border }]} />
                                        ) : null}

                                        <TouchableOpacity
                                            accessibilityRole="radio"
                                            accessibilityState={{ selected: isSelected }}
                                            activeOpacity={0.7}
                                            onPress={() => handleSelect(reason.id)}
                                            style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingHorizontal: SPACING.base,
                                                paddingVertical: SPACING.compact,
                                                minHeight: 56,
                                                backgroundColor: isSelected ? c.rowSelected : 'transparent',
                                            }}
                                        >
                                            <View
                                                style={{
                                                    width: 38,
                                                    height: 38,
                                                    borderRadius: RADIUS.sm,
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    marginRight: SPACING.compact,
                                                    backgroundColor: isSelected ? c.primary : c.iconBg,
                                                }}
                                            >
                                                <Ionicons
                                                    name={reason.icon}
                                                    size={19}
                                                    color={isSelected ? t.primaryForeground : c.muted}
                                                />
                                            </View>

                                            <Text
                                                numberOfLines={1}
                                                style={{
                                                    flex: 1,
                                                    fontSize: 16,
                                                    lineHeight: 21,
                                                    marginRight: SPACING.tight,
                                                    color: c.foreground,
                                                    fontWeight: isSelected ? '600' : '500',
                                                }}
                                            >
                                                {reason.label}
                                            </Text>

                                            <Ionicons
                                                name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                                                size={22}
                                                color={isSelected ? c.primary : c.border}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                    </View>

                    <View style={styles.footer}>
                        <TouchableOpacity
                            accessibilityRole="button"
                            accessibilityState={{ disabled: !canConfirm }}
                            activeOpacity={0.85}
                            disabled={!canConfirm}
                            onPress={() => selected && onConfirm(selected)}
                            style={[
                                styles.confirmBtn,
                                { backgroundColor: canConfirm ? c.destructive : c.disabledBtn },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.confirmText,
                                    { color: canConfirm ? '#FFFFFF' : c.muted },
                                ]}
                            >
                                {isSubmitting ? 'Cancelling…' : 'Confirm cancel'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            accessibilityRole="button"
                            activeOpacity={0.7}
                            onPress={onClose}
                            style={[styles.keepBtn, { borderColor: c.border, backgroundColor: c.sheet }]}
                        >
                            <Text style={[styles.keepText, { color: c.foreground }]}>Keep my match</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        borderWidth: StyleSheet.hairlineWidth,
        borderBottomWidth: 0,
        maxHeight: '90%',
    },
    handle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: SPACING.tight,
        marginBottom: SPACING.compact,
    },
    body: {
        paddingHorizontal: SPACING.comfortable,
        paddingBottom: SPACING.base,
    },
    header: {
        alignItems: 'center',
        marginBottom: SPACING.section,
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.compact,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        lineHeight: 26,
        textAlign: 'center',
        marginBottom: SPACING.tight,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 21,
        textAlign: 'center',
    },
    creditNote: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.tight,
        marginTop: SPACING.compact,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        width: '100%',
    },
    creditNoteText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    sectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        marginBottom: SPACING.tight,
        textTransform: 'none',
    },
    group: {
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: SPACING.base + 38 + SPACING.compact,
    },
    footer: {
        paddingHorizontal: SPACING.comfortable,
        paddingTop: SPACING.tight,
    },
    confirmBtn: {
        minHeight: 50,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: SPACING.tight,
    },
    confirmText: {
        fontSize: 16,
        fontWeight: '700',
    },
    keepBtn: {
        minHeight: 50,
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    keepText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
