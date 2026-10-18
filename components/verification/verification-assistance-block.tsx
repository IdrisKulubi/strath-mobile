import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast';
import { useSubmitVerificationAssistance } from '@/hooks/use-verification-assistance';
import {
    VERIFICATION_ASSISTANCE_CONFIRMATION,
    VERIFICATION_ASSISTANCE_EXPANDED_HINT,
    VERIFICATION_ASSISTANCE_PLACEHOLDER,
} from '@/lib/verification/verification-copy';
import { useVerificationThemedStyles } from '@/lib/verification/use-verification-themed-styles';
import { RADIUS, SPACING } from '@/lib/design-tokens';

const MIN_LENGTH = 10;
const MAX_LENGTH = 1000;

interface VerificationAssistanceBlockProps {
    sessionId: string;
}

export function VerificationAssistanceBlock({ sessionId }: VerificationAssistanceBlockProps) {
    const theme = useVerificationThemedStyles();
    const { show: showToast } = useToast();
    const { mutateAsync: submit, isPending } = useSubmitVerificationAssistance();
    const [expanded, setExpanded] = useState(false);
    const [message, setMessage] = useState('');
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        setExpanded(false);
        setMessage('');
        setSubmitted(false);
    }, [sessionId]);

    const trimmedLength = message.trim().length;
    const canSubmit = trimmedLength >= MIN_LENGTH && !isPending && !submitted;

    const counterColor = useMemo(() => {
        if (trimmedLength > MAX_LENGTH - 50) {
            return theme.colors.destructive;
        }
        return theme.colors.mutedForeground;
    }, [trimmedLength, theme.colors.destructive, theme.colors.mutedForeground]);

    const handleExpand = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpanded(true);
    }, []);

    const handleSubmit = useCallback(async () => {
        if (!canSubmit) {
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            const result = await submit({ sessionId, message: message.trim() });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setSubmitted(true);
            setExpanded(false);
            if (result.alreadySubmitted) {
                setSubmitted(true);
            }
        } catch (error) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showToast({
                message: error instanceof Error ? error.message : 'Failed to send your message',
                variant: 'danger',
            });
        }
    }, [canSubmit, message, sessionId, showToast, submit]);

    if (submitted) {
        return (
            <Text variant="muted" style={styles.confirmation}>
                {VERIFICATION_ASSISTANCE_CONFIRMATION}
            </Text>
        );
    }

    if (!expanded) {
        return (
            <Button
                variant="outline"
                onPress={handleExpand}
                style={styles.fullWidth}
                accessibilityLabel="Get assistance with verification"
            >
                <Text>Get assistance</Text>
            </Button>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.formWrap}
        >
            <View style={styles.formCard}>
                <Text variant="muted" style={{ marginBottom: SPACING.tight }}>
                    {VERIFICATION_ASSISTANCE_EXPANDED_HINT}
                </Text>
                <TextInput
                    value={message}
                    onChangeText={setMessage}
                    placeholder={VERIFICATION_ASSISTANCE_PLACEHOLDER}
                    placeholderTextColor={theme.colors.mutedForeground}
                    multiline
                    maxLength={MAX_LENGTH}
                    textAlignVertical="top"
                    style={[
                        styles.input,
                        {
                            color: theme.colors.foreground,
                            borderColor: theme.colors.border,
                            backgroundColor: theme.colors.background,
                        },
                    ]}
                    accessibilityLabel="Describe your verification issue"
                />
                <Text variant="caption" style={{ color: counterColor, alignSelf: 'flex-end' }}>
                    {trimmedLength}/{MAX_LENGTH}
                </Text>
                <View style={styles.formActions}>
                    <Button
                        variant="outline"
                        onPress={() => setExpanded(false)}
                        disabled={isPending}
                        style={styles.actionButton}
                        accessibilityLabel="Cancel assistance request"
                    >
                        <Text>Cancel</Text>
                    </Button>
                    <Button
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                        style={styles.actionButton}
                        accessibilityLabel="Send assistance message"
                    >
                        {isPending ? (
                            <ActivityIndicator color={theme.colors.foreground} />
                        ) : (
                            <Text>Send message</Text>
                        )}
                    </Button>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    fullWidth: {
        width: '100%',
        minHeight: 48,
    },
    confirmation: {
        width: '100%',
        lineHeight: 22,
    },
    formWrap: {
        width: '100%',
    },
    formCard: {
        width: '100%',
        gap: SPACING.compact,
    },
    input: {
        minHeight: 120,
        borderWidth: 1,
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.compact,
        fontSize: 16,
        lineHeight: 22,
    },
    formActions: {
        flexDirection: 'row',
        gap: SPACING.compact,
    },
    actionButton: {
        flex: 1,
        minHeight: 48,
    },
});
