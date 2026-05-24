import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
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
    const { colors } = useTheme();
    const copy = copyForContext(context, partnerName);

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
                    <Pressable
                        onPress={onEnable}
                        style={({ pressed }) => [
                            styles.primaryBtn,
                            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
                        ]}
                    >
                        <Text style={[styles.primaryLabel, { color: colors.primaryForeground }]}>
                            {copy.enableLabel}
                        </Text>
                    </Pressable>
                    <Pressable onPress={onDismiss} style={styles.secondaryBtn}>
                        <Text style={[styles.secondaryLabel, { color: colors.mutedForeground }]}>
                            Not now
                        </Text>
                    </Pressable>
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
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 36,
        gap: 12,
    },
    iconWrap: {
        width: 52,
        height: 52,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        marginBottom: 4,
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
        marginBottom: 8,
    },
    primaryBtn: {
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
    },
    primaryLabel: {
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryBtn: {
        paddingVertical: 10,
        alignItems: 'center',
    },
    secondaryLabel: {
        fontSize: 15,
        fontWeight: '500',
    },
});
