import React from 'react';
import {
    Pressable,
    StyleSheet,
    Text as RNText,
    TouchableOpacity,
    View,
    type StyleProp,
    type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useConfirmMeetupSlot } from '@/hooks/use-confirm-meetup-slot';
import { useNotificationPermissionPrompt } from '@/context/notification-permission-context';
import { useToast } from '@/components/ui/toast';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { formatConfirmBy, formatMeetupSlot, MEETUP_WINDOWS_COPY } from '@/lib/meetup-slot';

export interface MeetupSlotConfirmProps {
    mutualMatchId: string;
    partnerFirstName: string;
    scheduledAt: string | null;
    confirmBy: string | null;
    viewerSlotConfirmed: boolean;
    partnerSlotConfirmed: boolean;
    confirmWindowOpen: boolean;
    layout?: 'inline' | 'modal';
    style?: StyleProp<ViewStyle>;
}

export function MeetupSlotConfirm({
    mutualMatchId,
    partnerFirstName,
    scheduledAt,
    confirmBy,
    viewerSlotConfirmed,
    partnerSlotConfirmed,
    confirmWindowOpen,
    layout = 'inline',
    style,
}: MeetupSlotConfirmProps) {
    const { colors } = useTheme();
    const toast = useToast();
    const confirm = useConfirmMeetupSlot();
    const { promptIfAppropriate } = useNotificationPermissionPrompt();
    const primaryFill = colors.primary;
    const isModal = layout === 'modal';

    const canConfirm =
        confirmWindowOpen && !viewerSlotConfirmed && !confirm.isPending;

    const handleConfirm = () => {
        if (!canConfirm) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        confirm.mutate(mutualMatchId, {
            onSuccess: async (data) => {
                if (data?.status === 'finalized') {
                    toast.show({
                        message: 'Date confirmed. See you on campus.',
                        variant: 'success',
                    });
                } else {
                    toast.show({
                        message: `Waiting for ${partnerFirstName} to confirm.`,
                        variant: 'default',
                    });
                }
                await promptIfAppropriate({
                    context: 'after_confirm',
                    partnerName: partnerFirstName,
                });
            },
            onError: () => {
                toast.show({
                    message: 'Could not confirm right now. Try again.',
                    variant: 'danger',
                });
            },
        });
    };

    const partnerLine = viewerSlotConfirmed
        ? partnerSlotConfirmed
            ? 'You both confirmed.'
            : `Waiting for ${partnerFirstName} to confirm.`
        : partnerSlotConfirmed
          ? `${partnerFirstName} confirmed. Tap below to lock in.`
          : `Confirm your assigned time with ${partnerFirstName}.`;

    if (isModal) {
        return (
            <View style={[styles.modalPanel, { backgroundColor: colors.card, borderColor: colors.border }, style]}>
                <View style={styles.modalBody}>
                    {scheduledAt ? (
                        <View style={[styles.modalSlotHero, { backgroundColor: colors.muted }]}>
                            <Ionicons name="calendar-outline" size={22} color={primaryFill} />
                            <RNText style={[styles.modalSlotText, { color: colors.foreground }]}>
                                {formatMeetupSlot(scheduledAt)}
                            </RNText>
                        </View>
                    ) : null}

                    {confirmBy ? (
                        <RNText style={[styles.modalDeadline, { color: colors.mutedForeground }]}>
                            Confirm by {formatConfirmBy(confirmBy)}
                        </RNText>
                    ) : null}

                    <RNText style={[styles.modalVenueCopy, { color: colors.mutedForeground }]}>
                        {MEETUP_WINDOWS_COPY}
                    </RNText>

                    <RNText style={[styles.modalPartnerLine, { color: colors.mutedForeground }]}>
                        {partnerLine}
                    </RNText>

                    {!confirmWindowOpen && !viewerSlotConfirmed ? (
                        <RNText style={[styles.closedCopy, styles.modalClosedCopy, { color: colors.destructive }]}>
                            The confirmation window has closed.
                        </RNText>
                    ) : null}
                </View>

                {viewerSlotConfirmed ? (
                    <View
                        style={[
                            styles.confirmedBadge,
                            styles.modalConfirmedBadge,
                            { borderColor: colors.border },
                        ]}
                    >
                        <Ionicons name="checkmark-circle" size={20} color={primaryFill} />
                        <RNText style={[styles.confirmedLabel, { color: colors.foreground }]}>
                            You confirmed
                        </RNText>
                    </View>
                ) : (
                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Confirm date"
                        activeOpacity={0.88}
                        disabled={!canConfirm}
                        onPress={handleConfirm}
                    >
                        <View
                            style={[
                                styles.modalConfirmButton,
                                {
                                    backgroundColor: colors.primary,
                                    borderColor: colors.primary,
                                },
                                !canConfirm && styles.modalButtonDisabled,
                            ]}
                        >
                            <RNText style={styles.modalConfirmLabel}>
                                {confirm.isPending ? 'Confirming…' : 'Confirm date'}
                            </RNText>
                        </View>
                    </TouchableOpacity>
                )}
            </View>
        );
    }

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                },
                style,
            ]}
        >
            <RNText style={[styles.title, { color: colors.foreground }]}>Your StrathSpace date</RNText>
            <RNText style={[styles.windowsCopy, { color: colors.mutedForeground }]}>
                {MEETUP_WINDOWS_COPY}
            </RNText>

            {scheduledAt ? (
                <View style={styles.slotRow}>
                    <Ionicons name="calendar-outline" size={18} color={primaryFill} />
                    <RNText style={[styles.slotText, { color: colors.foreground }]}>
                        {formatMeetupSlot(scheduledAt)}
                    </RNText>
                </View>
            ) : null}

            {confirmBy ? (
                <RNText style={[styles.deadline, { color: colors.mutedForeground }]}>
                    Confirm by {formatConfirmBy(confirmBy)}
                </RNText>
            ) : null}

            <RNText style={[styles.partnerLine, { color: colors.mutedForeground }]}>{partnerLine}</RNText>

            {viewerSlotConfirmed ? (
                <View style={[styles.confirmedBadge, { borderColor: colors.border }]}>
                    <Ionicons name="checkmark-circle" size={18} color={primaryFill} />
                    <RNText style={[styles.confirmedLabel, { color: colors.foreground }]}>
                        You confirmed
                    </RNText>
                </View>
            ) : (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Confirm date"
                    disabled={!canConfirm}
                    onPress={handleConfirm}
                    style={({ pressed }) => [
                        styles.confirmPill,
                        {
                            borderColor: primaryFill,
                            opacity: !canConfirm ? 0.5 : pressed ? 0.85 : 1,
                        },
                    ]}
                >
                    <RNText style={[styles.confirmLabel, { color: primaryFill }]}>
                        {confirm.isPending ? 'Confirming…' : 'Confirm date'}
                    </RNText>
                </Pressable>
            )}

            {!confirmWindowOpen && !viewerSlotConfirmed ? (
                <RNText style={[styles.closedCopy, { color: colors.destructive }]}>
                    The confirmation window has closed.
                </RNText>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.base,
        gap: SPACING.compact,
    },
    modalPanel: {
        width: '100%',
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.comfortable,
        gap: SPACING.section,
        alignItems: 'center',
    },
    modalBody: {
        width: '100%',
        alignItems: 'center',
        gap: SPACING.compact,
    },
    modalSlotHero: {
        width: '100%',
        alignItems: 'center',
        gap: SPACING.tight,
        paddingVertical: SPACING.section,
        paddingHorizontal: SPACING.base,
        borderRadius: RADIUS.md,
    },
    modalSlotText: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
    },
    modalDeadline: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        fontWeight: '600',
    },
    modalVenueCopy: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        paddingHorizontal: SPACING.tight,
    },
    modalPartnerLine: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
    },
    modalClosedCopy: {
        textAlign: 'center',
    },
    modalConfirmButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    modalButtonDisabled: {
        opacity: 0.45,
    },
    modalConfirmLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    windowsCopy: {
        fontSize: 13,
        lineHeight: 18,
    },
    slotRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
    },
    slotText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        lineHeight: 20,
    },
    deadline: {
        fontSize: 13,
        lineHeight: 18,
    },
    partnerLine: {
        fontSize: 13,
        lineHeight: 18,
    },
    confirmPill: {
        alignSelf: 'flex-start',
        minHeight: 44,
        borderRadius: RADIUS.full,
        borderWidth: 1.5,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    confirmLabel: {
        fontSize: 15,
        fontWeight: '700',
    },
    confirmedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: RADIUS.full,
        borderWidth: StyleSheet.hairlineWidth,
    },
    modalConfirmedBadge: {
        alignSelf: 'stretch',
        justifyContent: 'center',
        minHeight: 52,
        borderRadius: RADIUS.md,
    },
    confirmedLabel: {
        fontSize: 14,
        fontWeight: '600',
    },
    closedCopy: {
        fontSize: 13,
        lineHeight: 18,
    },
});
