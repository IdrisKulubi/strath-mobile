import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/hooks/use-theme';
import { useConfirmMeetupSlot } from '@/hooks/use-confirm-meetup-slot';
import { usePayToConfirm } from '@/hooks/use-pay-to-confirm';
import { usePaymentsEnabled } from '@/hooks/use-payments-enabled';
import { useProfile } from '@/hooks/use-profile';
import { useRequestReschedule } from '@/hooks/use-reschedule';
import { useToast } from '@/components/ui/toast';
import { RescheduleSlotPickerSheet } from '@/components/dates/reschedule-slot-picker-sheet';
import { formatMeetupSlot } from '@/lib/meetup-slot';
import type { RescheduleViewerState } from '@/lib/reschedule-types';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';

export interface MeetupRescheduleSectionProps {
    mutualMatchId: string;
    dateMatchId?: string | null;
    partnerFirstName: string;
    viewerSlotConfirmed: boolean;
    reschedule?: RescheduleViewerState;
    layout?: 'inline' | 'modal';
}

export function MeetupRescheduleSection({
    mutualMatchId,
    dateMatchId,
    partnerFirstName,
    viewerSlotConfirmed,
    reschedule,
    layout = 'inline',
}: MeetupRescheduleSectionProps) {
    const { colors } = useTheme();
    const toast = useToast();
    const confirm = useConfirmMeetupSlot();
    const payToConfirm = usePayToConfirm();
    const { paymentsEnabled } = usePaymentsEnabled();
    const requestReschedule = useRequestReschedule();
    const { data: profile } = useProfile();
    const [pickerVisible, setPickerVisible] = useState(false);

    if (!reschedule) return null;

    const pending = reschedule.pending;
    const isRequesterWaiting = Boolean(
        pending
        && !pending.isYourTurnToRespond
        && profile?.id
        && pending.requestedByUserId === profile.id,
    );

    if (!reschedule.canRequest && !pending) return null;

    const openPickerAfterConfirm = () => setPickerVisible(true);

    const handleRequestPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        if (!viewerSlotConfirmed) {
            Alert.alert(
                'Confirm your date first',
                'Confirm your assigned meetup before you can request a different time.',
                [
                    { text: 'Not now', style: 'cancel' },
                    {
                        text: 'Confirm date',
                        onPress: () => {
                            if (paymentsEnabled && dateMatchId) {
                                payToConfirm.mutate(
                                    { mutualMatchId, dateMatchId, partnerFirstName },
                                    {
                                        onSuccess: (result) => {
                                            if (result.outcome !== 'cancelled' && result.outcome !== 'unpaid') {
                                                openPickerAfterConfirm();
                                            }
                                        },
                                    },
                                );
                                return;
                            }
                            confirm.mutate(mutualMatchId, {
                                onSuccess: () => openPickerAfterConfirm(),
                            });
                        },
                    },
                ],
            );
            return;
        }

        if (isRequesterWaiting) {
            toast.show({
                message: `Waiting for ${partnerFirstName} to respond to your date change.`,
                variant: 'default',
            });
            return;
        }

        if (reschedule.blockReason === 'pending_exists') {
            toast.show({
                message: 'You already have a pending date change request.',
                variant: 'default',
            });
            return;
        }

        if (!reschedule.canRequest) return;

        setPickerVisible(true);
    };

    const handleSelectSlot = (option: { scheduledAt: string; label: string }) => {
        Alert.alert(
            'Request date change?',
            `Move your date to ${option.label}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request change',
                    onPress: () => {
                        requestReschedule.mutate(
                            { mutualMatchId, proposedScheduledAt: option.scheduledAt },
                            {
                                onSuccess: () => {
                                    setPickerVisible(false);
                                    toast.show({
                                        message: `Request sent to ${partnerFirstName}.`,
                                        variant: 'success',
                                    });
                                },
                                onError: (error) => {
                                    toast.show({
                                        message:
                                            error instanceof Error
                                                ? error.message
                                                : 'Could not request a date change.',
                                        variant: 'danger',
                                    });
                                },
                            },
                        );
                    },
                },
            ],
        );
    };

    const isModal = layout === 'modal';

    return (
        <>
            {pending?.isYourTurnToRespond ? null : (
                <View style={styles.wrap}>
                    {isRequesterWaiting ? (
                        <RNText style={[styles.waitingCopy, { color: colors.mutedForeground }]}>
                            Waiting for {partnerFirstName} to respond
                            {pending?.proposedScheduledAt
                                ? ` · ${formatMeetupSlot(pending.proposedScheduledAt)}`
                                : ''}
                            .
                        </RNText>
                    ) : reschedule.canRequest ? (
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel="Request date change"
                            onPress={handleRequestPress}
                            disabled={requestReschedule.isPending}
                            style={({ pressed }) => [
                                isModal ? styles.modalSecondaryBtn : styles.inlineLinkBtn,
                                isModal && {
                                    borderColor: colors.primary,
                                    backgroundColor: pressed
                                        ? `${colors.primary}14`
                                        : 'transparent',
                                },
                                !isModal && { opacity: pressed ? 0.75 : 1 },
                            ]}
                        >
                            <RNText
                                style={[
                                    isModal ? styles.modalSecondaryLabel : styles.inlineLinkLabel,
                                    { color: colors.primary },
                                ]}
                            >
                                {requestReschedule.isPending ? 'Sending request…' : 'Request date change'}
                            </RNText>
                        </Pressable>
                    ) : null}
                </View>
            )}

            <RescheduleSlotPickerSheet
                visible={pickerVisible}
                mutualMatchId={mutualMatchId}
                onClose={() => setPickerVisible(false)}
                onSelect={handleSelectSlot}
            />
        </>
    );
}

const styles = StyleSheet.create({
    wrap: {
        width: '100%',
        alignItems: 'center',
    },
    inlineLinkBtn: {
        paddingVertical: SPACING.tight,
    },
    inlineLinkLabel: {
        ...TYPOGRAPHY.caption,
        fontWeight: '700',
        textAlign: 'center',
    },
    modalSecondaryBtn: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    modalSecondaryLabel: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
    waitingCopy: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
    },
});
