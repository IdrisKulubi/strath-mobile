import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { AI_CONSENT_DISCLOSURE, AI_PROVIDER_NAME } from '@/lib/ai-consent';

interface AiConsentCardProps {
    title?: string;
    description?: string;
    allowLabel?: string;
    isLoading?: boolean;
    onAllow: () => void | Promise<void>;
    onOpenPrivacy: () => void;
}

export function AiConsentCard({
    title = 'Allow AI features to continue',
    description = `${AI_PROVIDER_NAME} powers voice transcription and Wingman recommendations in this part of the app.`,
    allowLabel = 'Allow AI Features',
    isLoading = false,
    onAllow,
    onOpenPrivacy,
}: AiConsentCardProps) {
    const { colors } = useTheme();

    return (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>{description}</Text>

            <View style={styles.list}>
                {AI_CONSENT_DISCLOSURE.map((item) => (
                    <View key={item} style={styles.listItem}>
                        <Text style={[styles.bullet, { color: colors.primary }]}>•</Text>
                        <Text style={[styles.listText, { color: colors.foreground }]}>{item}</Text>
                    </View>
                ))}
            </View>

            <Pressable
                style={[styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={onAllow}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator size="small" color={colors.primaryForeground} />
                ) : (
                    <Text style={[styles.primaryButtonText, { color: colors.primaryForeground }]}>{allowLabel}</Text>
                )}
            </Pressable>

            <Pressable
                style={[styles.secondaryButton, { borderColor: colors.border }]}
                onPress={onOpenPrivacy}
            >
                <Text style={[styles.secondaryButtonText, { color: colors.foreground }]}>Review Privacy Policy</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        borderWidth: 1,
        borderRadius: 20,
        padding: 18,
        gap: 14,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        lineHeight: 28,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    list: {
        gap: 10,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    bullet: {
        fontSize: 16,
        lineHeight: 20,
    },
    listText: {
        flex: 1,
        fontSize: 14,
        lineHeight: 20,
    },
    primaryButton: {
        minHeight: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryButton: {
        minHeight: 46,
        borderWidth: 1,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
