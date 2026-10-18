import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { AI_CONSENT_DISCLOSURE, AI_PROVIDER_NAME } from '@/lib/ai-consent';
import { MATCHMAKER_HOME } from '@/lib/design-tokens';

interface AiConsentCardProps {
    title?: string;
    description?: string;
    disclosure?: string[];
    allowLabel?: string;
    tone?: 'default' | 'matchmaker-dark';
    isLoading?: boolean;
    onAllow: () => void | Promise<void>;
    onOpenPrivacy: () => void;
}

export function AiConsentCard({
    title = 'Allow AI features to continue',
    description = `${AI_PROVIDER_NAME} powers voice transcription and Wingman recommendations in this part of the app.`,
    disclosure = AI_CONSENT_DISCLOSURE,
    allowLabel = 'Allow AI Features',
    tone = 'default',
    isLoading = false,
    onAllow,
    onOpenPrivacy,
}: AiConsentCardProps) {
    const { colors } = useTheme();
    const isMatchmakerDark = tone === 'matchmaker-dark';
    const foreground = isMatchmakerDark ? MATCHMAKER_HOME.foreground : colors.foreground;
    const mutedForeground = isMatchmakerDark ? MATCHMAKER_HOME.mutedForeground : colors.mutedForeground;
    const primary = isMatchmakerDark ? MATCHMAKER_HOME.primary : colors.primary;
    const border = isMatchmakerDark ? MATCHMAKER_HOME.border : colors.border;

    return (
        <View style={styles.content}>
            <Text style={[styles.title, { color: foreground }]}>{title}</Text>
            <Text style={[styles.description, { color: mutedForeground }]}>{description}</Text>

            <View style={styles.list}>
                {disclosure.map((item) => (
                    <View key={item} style={styles.listItem}>
                        <Text style={[styles.bullet, { color: primary }]}>•</Text>
                        <Text style={[styles.listText, { color: foreground }]}>{item}</Text>
                    </View>
                ))}
            </View>

            <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: isLoading, busy: isLoading }}
                style={[
                    styles.allowButton,
                    {
                        borderColor: primary,
                        backgroundColor: isMatchmakerDark ? MATCHMAKER_HOME.primary : 'transparent',
                    },
                ]}
                onPress={onAllow}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator
                        size="small"
                        color={isMatchmakerDark ? MATCHMAKER_HOME.primaryForeground : primary}
                    />
                ) : (
                    <Text
                        style={[
                            styles.allowButtonText,
                            { color: isMatchmakerDark ? MATCHMAKER_HOME.primaryForeground : primary },
                        ]}
                    >
                        {allowLabel}
                    </Text>
                )}
            </Pressable>

            <Pressable
                accessibilityRole="button"
                style={[styles.secondaryButton, { borderColor: border }]}
                onPress={onOpenPrivacy}
            >
                <Text style={[styles.secondaryButtonText, { color: foreground }]}>Review Privacy Policy</Text>
            </Pressable>
        </View>
    );
}

const styles = StyleSheet.create({
    content: {
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
    allowButton: {
        minHeight: 48,
        borderWidth: 1,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        backgroundColor: 'transparent',
    },
    allowButtonText: {
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
        backgroundColor: 'transparent',
    },
    secondaryButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
});
