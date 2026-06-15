import React from 'react';
import { StyleSheet, Text as RNText, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@/hooks/use-theme';
import type { RescheduleViewerState } from '@/lib/reschedule-types';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

const MODAL_RESCHEDULE_COPY =
    'You can request another Wed or Sat slot after you confirm.';

export function shouldShowRescheduleAfterConfirmHint(
    reschedule: RescheduleViewerState | undefined,
    viewerSlotConfirmed: boolean,
    confirmWindowOpen: boolean,
): boolean {
    if (!reschedule || reschedule.blockReason === 'feature_disabled') return false;
    if (!confirmWindowOpen || viewerSlotConfirmed) return false;
    if (reschedule.pending) return false;
    return true;
}

export interface MeetupRescheduleAfterConfirmHintProps {
    reschedule?: RescheduleViewerState;
    viewerSlotConfirmed: boolean;
    confirmWindowOpen: boolean;
    layout?: 'inline' | 'modal';
}

export function MeetupRescheduleAfterConfirmHint({
    reschedule,
    viewerSlotConfirmed,
    confirmWindowOpen,
    layout = 'inline',
}: MeetupRescheduleAfterConfirmHintProps) {
    const { colors, isDark } = useTheme();
    const isModal = layout === 'modal';

    if (!shouldShowRescheduleAfterConfirmHint(reschedule, viewerSlotConfirmed, confirmWindowOpen)) {
        return null;
    }

    const tint = isDark ? 'rgba(217, 74, 143, 0.12)' : 'rgba(184, 50, 122, 0.08)';
    const borderTint = isDark ? 'rgba(217, 74, 143, 0.28)' : 'rgba(184, 50, 122, 0.2)';

    if (isModal) {
        return (
            <View
                accessibilityRole="text"
                accessibilityLabel={MODAL_RESCHEDULE_COPY}
                style={styles.wrapModalRow}
            >
                <Ionicons name="swap-horizontal-outline" size={18} color={colors.primary} />
                <RNText style={[styles.modalRowText, { color: colors.mutedForeground }]}>
                    {MODAL_RESCHEDULE_COPY}
                </RNText>
            </View>
        );
    }

    return (
        <View
            accessibilityRole="text"
            accessibilityLabel="After you confirm, you can request a different Wednesday or Saturday time if your plans change."
            style={[
                styles.wrap,
                styles.wrapInline,
                {
                    backgroundColor: tint,
                    borderColor: borderTint,
                },
            ]}
        >
            <Ionicons
                name="swap-horizontal-outline"
                size={18}
                color={colors.primary}
                style={styles.icon}
            />
            <View style={styles.textCol}>
                <RNText style={[styles.title, { color: colors.foreground }]}>
                    Need a different time later?
                </RNText>
                <RNText style={[styles.body, { color: colors.mutedForeground }]}>
                    After you confirm, you can request another Wednesday or Saturday slot if plans
                    change.
                </RNText>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%',
        paddingVertical: SPACING.compact,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
    },
    wrapInline: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.compact,
    },
    wrapModalRow: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.tight,
        paddingHorizontal: SPACING.tight,
        paddingVertical: SPACING.micro,
    },
    modalRowText: {
        ...TYPOGRAPHY.caption,
        flex: 1,
        lineHeight: 18,
    },
    icon: {
        marginTop: 2,
    },
    textCol: {
        flex: 1,
        gap: SPACING.micro,
    },
    title: {
        ...TYPOGRAPHY.caption,
        fontWeight: '600',
        textAlign: 'left',
    },
    body: {
        ...TYPOGRAPHY.caption,
        lineHeight: 18,
        textAlign: 'left',
    },
});
