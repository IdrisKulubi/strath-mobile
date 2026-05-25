import React from 'react';
import { Modal, Pressable, StyleSheet, Text as RNText, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { RADIUS, SPACING } from '@/lib/design-tokens';
import type { PrePermissionContext } from '@/lib/notification-permission-prompt';

interface PrePermissionSheetProps {
    visible: boolean;
    context: PrePermissionContext;
    partnerName?: string;
    onEnable: () => void;
    onDismiss: () => void;
}

function copyForContext(context: PrePermissionContext, partnerName?: string): {
    title: string;
    body: string;
    enableLabel: string;
} {
    const name = partnerName ?? 'your match';

    switch (context) {
        case 'mutual_match':
            return {
                title: 'Know when they confirm',
                body: `Turn on alerts so you hear when ${name} confirms your campus date, and before your confirm window closes.`,
                enableLabel: 'Enable alerts',
            };
        case 'after_confirm':
            return {
                title: 'Stay in the loop',
                body: 'Get a heads-up when your match confirms, when your date is set, and when they message you.',
                enableLabel: 'Enable alerts',
            };
        case 'settings':
            return {
                title: 'Match and date alerts',
                body: 'We only notify you for mutual matches, date confirmations, and messages — nothing noisy.',
                enableLabel: 'Enable alerts',
            };
        default:
            return {
                title: 'Enable alerts',
                body: 'Stay updated on matches and dates.',
                enableLabel: 'Enable alerts',
            };
    }
}

export function PrePermissionSheet({
    visible,
    context,
    partnerName,
    onEnable,
    onDismiss,
}: PrePermissionSheetProps) {
    const { colors, isDark } = useTheme();
    const copy = copyForContext(context, partnerName);
    const pinkTint = isDark ? 'rgba(217, 74, 143, 0.14)' : 'rgba(184, 50, 122, 0.1)';

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <Pressable style={styles.backdrop} onPress={onDismiss}>
                <Pressable
                    style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.border }]}
                    onPress={(e) => e.stopPropagation()}
                >
                    <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                        <Ionicons name="notifications-outline" size={28} color={colors.primary} />
                    </View>
                    <Text style={[styles.title, { color: colors.foreground }]}>{copy.title}</Text>
                    <Text style={[styles.body, { color: colors.mutedForeground }]}>{copy.body}</Text>

                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={copy.enableLabel}
                        activeOpacity={0.88}
                        onPress={onEnable}
                    >
                        <View
                            style={[
                                styles.primaryBtn,
                                {
                                    backgroundColor: colors.primary,
                                    borderColor: colors.primary,
                                },
                            ]}
                        >
                            <RNText style={styles.primaryLabel}>{copy.enableLabel}</RNText>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel="Not now"
                        activeOpacity={0.85}
                        onPress={onDismiss}
                    >
                        <View
                            style={[
                                styles.secondaryBtn,
                                {
                                    borderColor: colors.primary,
                                    backgroundColor: pinkTint,
                                },
                            ]}
                        >
                            <RNText style={[styles.secondaryLabel, { color: colors.primary }]}>
                                Not now
                            </RNText>
                        </View>
                    </TouchableOpacity>
                </Pressable>
            </Pressable>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: RADIUS.xl,
        borderTopRightRadius: RADIUS.xl,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.section,
        paddingTop: 28,
        paddingBottom: 36,
        gap: SPACING.compact,
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: RADIUS.md,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: SPACING.micro,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
    },
    body: {
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: SPACING.tight,
    },
    primaryBtn: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    primaryLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    secondaryBtn: {
        width: '100%',
        minHeight: 52,
        borderRadius: RADIUS.lg,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: SPACING.base,
    },
    secondaryLabel: {
        fontSize: 16,
        fontWeight: '700',
        textAlign: 'center',
    },
});
