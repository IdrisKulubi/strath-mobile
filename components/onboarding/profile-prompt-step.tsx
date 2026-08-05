import React, { useMemo, useState } from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    StyleSheet,
    TextInput,
    View,
} from 'react-native';
import Animated, { FadeInDown, FadeInUp, useReducedMotion } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { PROMPT_OPTIONS } from '@/constants/profile-options';
import { MOTION, Palette, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useOnboardingTheme, withOnboardingAlpha } from '@/lib/onboarding-theme';

import { OnboardingChoiceRow } from './onboarding-choice-row';
import { OnboardingHeader } from './onboarding-header';
import { OnboardingPrimaryButton } from './onboarding-primary-button';
import { OnboardingProgressBar } from './onboarding-progress-bar';
import { OnboardingScreenBackdrop } from './onboarding-screen-backdrop';
import { OnboardingScreenShell } from './onboarding-screen-shell';

const LEGACY_PROMPT_IDS = new Set(['dating_style', 'confession', 'favorite_way']);
const PROMPT_CHOICES = PROMPT_OPTIONS.filter((prompt) => !LEGACY_PROMPT_IDS.has(prompt.id));
const PROMPT_RESPONSE_MIN_LENGTH = 10;
const PROMPT_RESPONSE_MAX_LENGTH = 150;

interface ProfilePromptStepProps {
    globalStepIndex: number;
    prompts: { promptId: string; response: string }[];
    onUpdate: (prompts: { promptId: string; response: string }[]) => void;
    onComplete: () => void;
    onBack: () => void;
}

export function ProfilePromptStep({
    globalStepIndex,
    prompts,
    onUpdate,
    onComplete,
    onBack,
}: ProfilePromptStepProps) {
    const theme = useOnboardingTheme();
    const insets = useSafeAreaInsets();
    const reducedMotion = useReducedMotion();

    const [phase, setPhase] = useState<'pick' | 'answer'>(
        prompts[0]?.promptId && prompts[0]?.response ? 'answer' : 'pick',
    );
    const [selectedPromptId, setSelectedPromptId] = useState(prompts[0]?.promptId || '');
    const [response, setResponse] = useState(prompts[0]?.response || '');
    const [showAnswerError, setShowAnswerError] = useState(false);

    const errorColor = theme.isDark ? Palette.dark.destructive : Palette.light.destructive;
    const trimmedResponse = response.trim();
    const canContinueAnswer = trimmedResponse.length >= PROMPT_RESPONSE_MIN_LENGTH;

    const selectedPromptLabel = useMemo(
        () => PROMPT_CHOICES.find((prompt) => prompt.id === selectedPromptId)?.label ?? '',
        [selectedPromptId],
    );

    const topEntering = reducedMotion ? undefined : FadeInDown.delay(60).duration(MOTION.short);
    const mainEntering = reducedMotion ? undefined : FadeInUp.delay(100).duration(MOTION.short);
    const footerEntering = reducedMotion ? undefined : FadeInUp.delay(160).duration(MOTION.short);

    const handleBack = () => {
        Keyboard.dismiss();

        if (phase === 'answer') {
            setPhase('pick');
            setShowAnswerError(false);
            return;
        }

        onBack();
    };

    const handleSelectPrompt = (promptId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setSelectedPromptId(promptId);
        setShowAnswerError(false);
        setPhase('answer');
    };

    const handleContinue = () => {
        Keyboard.dismiss();

        if (!selectedPromptId || !canContinueAnswer) {
            setShowAnswerError(true);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            return;
        }

        onUpdate([
            {
                promptId: selectedPromptId,
                response: trimmedResponse.slice(0, PROMPT_RESPONSE_MAX_LENGTH),
            },
        ]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        onComplete();
    };

    if (phase === 'pick') {
        return (
            <OnboardingScreenShell
                stepIndex={globalStepIndex}
                onBack={handleBack}
                title="Pick a prompt"
                subtitle="Choose one — you'll write a short answer next."
                scrollable
            >
                <View style={styles.promptList}>
                    {PROMPT_CHOICES.map((prompt) => (
                        <OnboardingChoiceRow
                            key={prompt.id}
                            option={{ value: prompt.id, label: prompt.label }}
                            selected={selectedPromptId === prompt.id}
                            onPress={handleSelectPrompt}
                            showRadio={false}
                        />
                    ))}
                </View>
            </OnboardingScreenShell>
        );
    }

    return (
        <KeyboardAvoidingView
            style={[
                styles.answerContainer,
                {
                    paddingTop: insets.top + SPACING.compact,
                    paddingBottom: Math.max(insets.bottom, SPACING.base),
                },
            ]}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
            <OnboardingScreenBackdrop />

            <Pressable style={styles.answerBody} onPress={Keyboard.dismiss} accessible={false}>
                <Animated.View entering={topEntering} style={styles.topSection}>
                    <OnboardingProgressBar stepIndex={globalStepIndex} />
                    <OnboardingHeader
                        stepIndex={globalStepIndex}
                        onBack={handleBack}
                    />
                </Animated.View>

                <Animated.View entering={mainEntering} style={styles.answerMain}>
                    <Text style={[styles.answerTitle, { color: theme.foreground }]}>
                        Write your answer
                    </Text>

                    <View
                        style={[
                            styles.promptChip,
                            {
                                backgroundColor: withOnboardingAlpha(
                                    theme.primary,
                                    theme.isDark ? 0.16 : 0.08,
                                ),
                            },
                        ]}
                    >
                        <Text
                            style={[styles.promptChipText, { color: theme.foreground }]}
                            numberOfLines={2}
                        >
                            {selectedPromptLabel}
                        </Text>
                    </View>

                    <TextInput
                        value={response}
                        onChangeText={(text) => {
                            setResponse(text.slice(0, PROMPT_RESPONSE_MAX_LENGTH));
                            if (showAnswerError) {
                                setShowAnswerError(false);
                            }
                        }}
                        placeholder="Write something real and specific..."
                        placeholderTextColor={theme.mutedForeground}
                        multiline
                        autoFocus
                        blurOnSubmit={false}
                        textAlignVertical="top"
                        accessibilityLabel="Prompt answer"
                        style={[
                            styles.answerInput,
                            {
                                color: theme.foreground,
                                backgroundColor: theme.surface,
                                borderColor: showAnswerError ? errorColor : theme.border,
                            },
                        ]}
                    />

                    <View style={styles.answerMeta}>
                        <Text
                            style={[
                                styles.helperText,
                                {
                                    color: showAnswerError ? errorColor : theme.mutedForeground,
                                },
                            ]}
                        >
                            {trimmedResponse.length < PROMPT_RESPONSE_MIN_LENGTH
                                ? `At least ${PROMPT_RESPONSE_MIN_LENGTH} characters`
                                : 'Looks good'}
                        </Text>

                        <View style={styles.metaActions}>
                            <Text style={[styles.helperText, { color: theme.mutedForeground }]}>
                                {`${trimmedResponse.length}/${PROMPT_RESPONSE_MAX_LENGTH}`}
                            </Text>
                            <Pressable
                                onPress={Keyboard.dismiss}
                                accessibilityRole="button"
                                accessibilityLabel="Done editing"
                                hitSlop={8}
                                style={[
                                    styles.doneChip,
                                    {
                                        backgroundColor: theme.surfaceMuted,
                                        borderColor: theme.border,
                                    },
                                ]}
                            >
                                <Text style={[styles.doneChipText, { color: theme.foreground }]}>
                                    Done
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View entering={footerEntering} style={styles.footer}>
                    <OnboardingPrimaryButton
                        label="Continue"
                        onPress={handleContinue}
                        disabled={!canContinueAnswer}
                    />
                </Animated.View>
            </Pressable>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    promptList: {
        gap: SPACING.compact,
        paddingBottom: SPACING.base,
        width: '100%',
    },
    answerContainer: {
        flex: 1,
        paddingHorizontal: SPACING.screenX,
    },
    answerBody: {
        flex: 1,
    },
    topSection: {
        gap: SPACING.base,
    },
    answerMain: {
        flex: 1,
        gap: SPACING.compact,
        paddingTop: SPACING.base,
        justifyContent: 'flex-start',
    },
    answerTitle: {
        ...TYPOGRAPHY.display,
        fontSize: 24,
        lineHeight: 30,
    },
    promptChip: {
        borderRadius: RADIUS.md,
        paddingHorizontal: SPACING.compact,
        paddingVertical: SPACING.tight,
    },
    promptChipText: {
        ...TYPOGRAPHY.callout,
        fontWeight: '600',
    },
    answerInput: {
        minHeight: 110,
        maxHeight: 160,
        borderRadius: RADIUS.lg,
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: SPACING.base,
        paddingVertical: SPACING.compact,
        ...TYPOGRAPHY.body,
        width: '100%',
    },
    answerMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        gap: SPACING.tight,
    },
    metaActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.tight,
    },
    helperText: {
        ...TYPOGRAPHY.caption,
        flexShrink: 1,
    },
    doneChip: {
        minHeight: 32,
        paddingHorizontal: SPACING.compact,
        borderRadius: RADIUS.full,
        borderWidth: StyleSheet.hairlineWidth,
        alignItems: 'center',
        justifyContent: 'center',
    },
    doneChipText: {
        ...TYPOGRAPHY.caption,
        fontWeight: '700',
    },
    footer: {
        width: '100%',
        paddingTop: SPACING.compact,
    },
});
