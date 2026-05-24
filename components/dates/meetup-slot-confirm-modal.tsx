import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { MeetupSlotConfirm } from '@/components/dates/meetup-slot-confirm';
import { SPACING, RADIUS } from '@/lib/design-tokens';
import type { MatchHold } from '@/hooks/use-daily-matches';

interface MeetupSlotConfirmModalProps {
    visible: boolean;
    hold: MatchHold;
    onCancelHold?: () => void;
}

export function MeetupSlotConfirmModal({
    visible,
    hold,
    onCancelHold,
}: MeetupSlotConfirmModalProps) {
    const { colors } = useTheme();
    const partnerName = hold.partner.firstName ?? 'your match';
    const slot = hold.slotConfirmation;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {}}
        >
            <View style={[styles.screen, { backgroundColor: colors.background }]}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                        Confirm your date
                    </Text>
                    <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                        Confirm before you browse matches or message {partnerName}.
                    </Text>
                </View>

                <View style={[styles.partnerCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
                        {hold.partner.profilePhoto ? (
                            <CachedImage uri={hold.partner.profilePhoto} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatarFallback, { backgroundColor: colors.muted }]}>
                                <Ionicons name="person" size={28} color={colors.mutedForeground} />
                            </View>
                        )}
                    </View>
                    <View style={styles.partnerText}>
                        <Text style={[styles.partnerName, { color: colors.foreground }]}>
                            {partnerName}
                            {hold.partner.age ? `, ${hold.partner.age}` : ''}
                        </Text>
                        {hold.partner.course || hold.partner.university ? (
                            <Text style={[styles.partnerMeta, { color: colors.mutedForeground }]} numberOfLines={1}>
                                {[hold.partner.course, hold.partner.university].filter(Boolean).join(' · ')}
                            </Text>
                        ) : null}
                    </View>
                </View>

                <MeetupSlotConfirm
                    mutualMatchId={hold.mutualMatchId}
                    partnerFirstName={partnerName}
                    scheduledAt={slot.scheduledAt}
                    confirmBy={slot.confirmBy}
                    viewerSlotConfirmed={slot.viewerSlotConfirmed}
                    partnerSlotConfirmed={slot.partnerSlotConfirmed}
                    confirmWindowOpen={slot.confirmWindowOpen}
                />

                {onCancelHold ? (
                    <Pressable onPress={onCancelHold} accessibilityRole="button">
                        <Text style={[styles.cancelLink, { color: colors.mutedForeground }]}>
                            Cancel this match
                        </Text>
                    </Pressable>
                ) : null}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        paddingHorizontal: SPACING.base,
        paddingTop: SPACING.large,
        paddingBottom: SPACING.section,
        gap: SPACING.base,
    },
    header: {
        gap: SPACING.tight,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    headerSubtitle: {
        fontSize: 14,
        lineHeight: 20,
    },
    partnerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.compact,
        borderRadius: RADIUS.md,
        borderWidth: StyleSheet.hairlineWidth,
        padding: SPACING.compact,
    },
    avatarWrap: {
        width: 52,
        height: 52,
        borderRadius: 26,
        borderWidth: 1,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    avatarFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    partnerText: {
        flex: 1,
        gap: 2,
    },
    partnerName: {
        fontSize: 17,
        fontWeight: '600',
    },
    partnerMeta: {
        fontSize: 13,
    },
    cancelLink: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: SPACING.tight,
    },
});
