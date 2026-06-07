import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { CachedImage } from '@/components/ui/cached-image';
import { MeetupSlotConfirm } from '@/components/dates/meetup-slot-confirm';
import { useTheme } from '@/hooks/use-theme';
import type { MutualDate } from '@/hooks/use-date-requests';
import { RADIUS, SPACING } from '@/lib/design-tokens';

export interface ChatAccessGateProps {
    match: MutualDate;
    partnerName: string;
    partnerImage?: string | null;
}

export function ChatAccessGate({ match, partnerName, partnerImage }: ChatAccessGateProps) {
    const { colors, isDark } = useTheme();
    const router = useRouter();
    const primaryFill = colors.primary;

    const handleGoToDates = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/(tabs)/dates');
    }, [router]);

    const partnerWaiting =
        match.needsSlotConfirmation
        && !match.viewerSlotConfirmed
        && match.partnerSlotConfirmed;

    const viewerWaiting =
        match.needsSlotConfirmation
        && match.viewerSlotConfirmed
        && !match.partnerSlotConfirmed;

    return (
        <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {partnerImage ? (
                <CachedImage
                    uri={partnerImage}
                    style={styles.avatar}
                    contentFit="cover"
                />
            ) : (
                <View
                    style={[
                        styles.avatarPlaceholder,
                        { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' },
                    ]}
                >
                    <Ionicons name="person" size={40} color={colors.mutedForeground} />
                </View>
            )}

            <Text style={[styles.title, { color: colors.foreground }]}>
                Confirm your date to message
            </Text>

            <Text style={[styles.body, { color: colors.mutedForeground }]}>
                Confirm your assigned meetup with {partnerName} before you can message here.
            </Text>

            {partnerWaiting ? (
                <Text style={[styles.hint, { color: colors.primary }]}>
                    {partnerName} confirmed — your turn to lock in the date.
                </Text>
            ) : null}

            {viewerWaiting ? (
                <Text style={[styles.hint, { color: colors.mutedForeground }]}>
                    You confirmed · Waiting for {partnerName} to confirm.
                </Text>
            ) : null}

            {match.needsSlotConfirmation && match.confirmBy ? (
                <MeetupSlotConfirm
                    mutualMatchId={match.id}
                    partnerFirstName={match.withUser.firstName}
                    scheduledAt={match.scheduledAt ?? null}
                    confirmBy={match.confirmBy}
                    viewerSlotConfirmed={Boolean(match.viewerSlotConfirmed)}
                    partnerSlotConfirmed={Boolean(match.partnerSlotConfirmed)}
                    confirmWindowOpen={Boolean(match.confirmWindowOpen)}
                    reschedule={match.reschedule}
                    style={styles.confirmBlock}
                />
            ) : null}

            <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Go to Dates tab"
                activeOpacity={0.85}
                onPress={handleGoToDates}
            >
                <View
                    style={[
                        styles.secondaryButton,
                        {
                            borderColor: primaryFill,
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : '#fff',
                        },
                    ]}
                >
                    <Ionicons name="calendar-outline" size={18} color={primaryFill} />
                    <RNText style={[styles.secondaryButtonLabel, { color: primaryFill }]}>
                        Go to Dates
                    </RNText>
                </View>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: SPACING.base,
        paddingTop: SPACING.xl,
        paddingBottom: SPACING.xl,
        alignItems: 'center',
    },
    avatar: {
        width: 88,
        height: 88,
        borderRadius: 44,
        marginBottom: SPACING.base,
    },
    avatarPlaceholder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        marginBottom: SPACING.base,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: SPACING.compact,
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: SPACING.base,
        paddingHorizontal: SPACING.compact,
    },
    hint: {
        fontSize: 13,
        lineHeight: 18,
        fontWeight: '500',
        textAlign: 'center',
        marginBottom: SPACING.compact,
        paddingHorizontal: SPACING.compact,
    },
    confirmBlock: {
        width: '100%',
        marginBottom: SPACING.base,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.compact,
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
        marginTop: SPACING.compact,
    },
    secondaryButtonLabel: {
        fontSize: 16,
        fontWeight: '700',
    },
});
