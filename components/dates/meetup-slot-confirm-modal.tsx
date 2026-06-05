import React from 'react';
import { Modal, ScrollView, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { useTheme } from '@/hooks/use-theme';
import { MeetupSlotConfirm } from '@/components/dates/meetup-slot-confirm';
import { SPACING, RADIUS, TYPOGRAPHY } from '@/lib/design-tokens';
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
    const { colors, isDark } = useTheme();
    const cancelTint = isDark ? 'rgba(217, 74, 143, 0.14)' : 'rgba(184, 50, 122, 0.12)';
    const partnerName = hold.partner.firstName ?? 'your match';
    const slot = hold.slotConfirmation;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={() => {}}
        >
            <SafeAreaView
                edges={['top', 'bottom', 'left', 'right']}
                style={[styles.screen, { backgroundColor: colors.background }]}
            >
                <ScrollView
                    style={styles.scroll}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <View style={styles.content}>
                        <View style={styles.header}>
                            <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                                Confirm your date
                            </Text>
                            <Text style={[styles.headerSubtitle, { color: colors.mutedForeground }]}>
                                Confirm before you browse matches or message {partnerName}.
                            </Text>
                        </View>

                        <View style={styles.partnerHero}>
                            <View style={[styles.avatarWrap, { borderColor: colors.border }]}>
                                {hold.partner.profilePhoto ? (
                                    <CachedImage uri={hold.partner.profilePhoto} style={styles.avatar} />
                                ) : (
                                    <View style={[styles.avatarFallback, { backgroundColor: colors.muted }]}>
                                        <Ionicons name="person" size={36} color={colors.mutedForeground} />
                                    </View>
                                )}
                            </View>
                            <Text style={[styles.partnerName, { color: colors.foreground }]}>
                                {partnerName}
                                {hold.partner.age ? `, ${hold.partner.age}` : ''}
                            </Text>
                            {hold.partner.course || hold.partner.university ? (
                                <Text
                                    style={[styles.partnerMeta, { color: colors.mutedForeground }]}
                                    numberOfLines={2}
                                >
                                    {[hold.partner.course, hold.partner.university]
                                        .filter(Boolean)
                                        .join(' · ')}
                                </Text>
                            ) : null}
                        </View>

                        <MeetupSlotConfirm
                            layout="modal"
                            mutualMatchId={hold.mutualMatchId}
                            dateMatchId={hold.dateMatchId}
                            partnerFirstName={partnerName}
                            scheduledAt={slot.scheduledAt}
                            confirmBy={slot.confirmBy}
                            viewerSlotConfirmed={slot.viewerSlotConfirmed}
                            partnerSlotConfirmed={slot.partnerSlotConfirmed}
                            confirmWindowOpen={slot.confirmWindowOpen}
                            reschedule={slot.reschedule}
                        />
                    </View>
                </ScrollView>

                {onCancelHold ? (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            onPress={onCancelHold}
                            accessibilityRole="button"
                            activeOpacity={0.85}
                        >
                            <View
                                style={[
                                    styles.cancelButton,
                                    {
                                        borderColor: colors.primary,
                                        backgroundColor: cancelTint,
                                    },
                                ]}
                            >
                                <RNText style={[styles.cancelLabel, { color: colors.primary }]}>
                                    Cancel this match
                                </RNText>
                            </View>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.large,
        paddingBottom: SPACING.base,
    },
    content: {
        alignItems: 'center',
        gap: SPACING.base,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    header: {
        alignItems: 'center',
        gap: SPACING.micro,
        paddingHorizontal: SPACING.compact,
    },
    headerTitle: {
        ...TYPOGRAPHY.display,
        textAlign: 'center',
        letterSpacing: -0.4,
    },
    headerSubtitle: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
        maxWidth: 300,
    },
    partnerHero: {
        alignItems: 'center',
        gap: SPACING.tight,
        paddingHorizontal: SPACING.compact,
    },
    avatarWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: StyleSheet.hairlineWidth,
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
    partnerName: {
        ...TYPOGRAPHY.title,
        textAlign: 'center',
    },
    partnerMeta: {
        ...TYPOGRAPHY.caption,
        textAlign: 'center',
    },
    footer: {
        paddingHorizontal: SPACING.screenX,
        paddingTop: SPACING.compact,
        paddingBottom: SPACING.base,
        width: '100%',
        maxWidth: 400,
        alignSelf: 'center',
    },
    cancelButton: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    cancelLabel: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});
