import React, { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useReducedMotion } from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import {
    OnboardingChoiceRow,
    OnboardingPrimaryButton,
    OnboardingScreenShell,
    RisingInlineFeedback,
    useRisingBeatController,
    type OnboardingChoiceOption,
} from '@/components/onboarding';
import { HEIGHTS, RADIUS, SPACING, TYPOGRAPHY } from '@/lib/design-tokens';
import { useTheme } from '@/hooks/use-theme';

const OPTIONS: OnboardingChoiceOption[] = [
    { value: 'throughout', label: 'Throughout the day' },
    { value: 'few', label: 'A few times a day' },
    { value: 'once', label: 'Once a day' },
    { value: 'natural', label: 'Whenever feels natural' },
];

const IMPORTANCE: OnboardingChoiceOption[] = [
    { value: '0', label: 'Not a big deal', description: 'I’m flexible about this' },
    { value: '1', label: 'A little important', description: 'A small preference' },
    { value: '10', label: 'Somewhat important', description: 'I’d like us to be aligned' },
    { value: '50', label: 'Very important', description: 'This matters a lot to me' },
    { value: '250', label: 'Dealbreaker', description: 'This is essential for me' },
];

const VISIBILITY: OnboardingChoiceOption[] = [
    { value: 'private', label: 'Keep private', description: 'Still used to help find compatible people' },
    { value: 'public', label: 'Show on my profile', description: 'Can appear in comparisons when both people share' },
];

const TITLES = [
    'How often would you like to hear from someone you’re dating?',
    'What would work for you in a partner?',
    'How much does this matter?',
    'Keep it private or share it?',
    'Want to add a little context?',
];

function optionLabel(value: string) {
    return OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export default function RisingOnboardingPreview() {
    const router = useRouter();
    const { mode } = useLocalSearchParams<{ mode?: string }>();
    const { colors } = useTheme();
    const reducedMotion = useReducedMotion();
    const { beat, advance, back, jump } = useRisingBeatController(4, reducedMotion);
    const [ownAnswer, setOwnAnswer] = useState('');
    const [acceptable, setAcceptable] = useState<string[]>([]);
    const [importance, setImportance] = useState('');
    const [visibility, setVisibility] = useState('');
    const [note, setNote] = useState('');
    const [finished, setFinished] = useState(false);

    const long = mode === 'long';
    const loading = mode === 'loading';
    const error = mode === 'error';
    const title = long && beat === 0
        ? 'How often would you like to hear from someone you’re dating when the two of you have busy, very different schedules?'
        : TITLES[beat];
    const previousAnswer = beat === 0 ? undefined : beat === 1
        ? { label: 'Your answer', value: optionLabel(ownAnswer), onEdit: () => jump(0) }
        : beat === 2
            ? { label: 'Partner answers', value: `${acceptable.length} selected`, onEdit: () => jump(1) }
            : beat === 3
                ? { label: 'Importance', value: IMPORTANCE.find((item) => item.value === importance)?.label ?? '', onEdit: () => jump(2) }
                : { label: 'Visibility', value: visibility === 'private' ? 'Keep private' : 'Show on my profile', onEdit: () => jump(3) };

    const handleBack = () => beat === 0 ? router.back() : back();
    const chooseOwn = (value: string) => {
        setOwnAnswer(value);
        setAcceptable((items) => items.includes(value) ? items : [value, ...items]);
        advance();
    };
    const toggleAcceptable = (value: string) => {
        if (value === ownAnswer) return;
        setAcceptable((items) => items.includes(value) ? items.filter((item) => item !== value) : [...items, value]);
    };

    const footer = !loading && !error && !finished && (beat === 1 || beat === 4) ? (
        <OnboardingPrimaryButton
            appearance="rising"
            label={beat === 4 ? 'Save & continue' : 'Continue'}
            disabled={beat === 1 && acceptable.length === 0}
            onPress={() => beat === 4 ? setFinished(true) : advance()}
        />
    ) : null;

    return (
        <OnboardingScreenShell
            presentation="rising"
            stepIndex={0}
            beatKey={`${mode ?? 'normal'}:${beat}`}
            progressLabel="Your rhythm"
            progressIndex={0}
            progressCount={4}
            onBack={handleBack}
            title={loading ? 'Getting your question ready' : error ? 'We couldn’t load this question' : finished ? 'Preview complete' : title}
            subtitle={loading ? 'Your answers will appear here.' : error ? 'Your choices are still here. Try again.' : finished ? 'This preview did not save any answers.' : beat === 1 ? 'Choose all that feel right.' : beat === 4 ? 'A note is optional.' : undefined}
            previousAnswer={loading || error || finished ? undefined : previousAnswer}
            footer={footer}
        >
            {loading ? (
                <View accessibilityLabel="Loading question choices" style={styles.choices}>
                    {[0, 1, 2, 3].map((item) => <View key={item} style={[styles.skeleton, { backgroundColor: colors.control }]} />)}
                </View>
            ) : error ? (
                <View style={styles.choices}>
                    <RisingInlineFeedback tone="error" message="The question could not be loaded. Your current choices are still available." />
                    <OnboardingPrimaryButton appearance="rising" label="Try again" onPress={() => router.replace('/ui-preview/onboarding-rising' as never)} />
                </View>
            ) : finished ? (
                <OnboardingPrimaryButton appearance="rising" label="Try the flow again" onPress={() => { setOwnAnswer(''); setAcceptable([]); setImportance(''); setVisibility(''); setNote(''); setFinished(false); jump(0); }} />
            ) : beat === 0 ? (
                <View style={styles.choices}>
                    {OPTIONS.map((option) => (
                        <OnboardingChoiceRow key={option.value} appearance="rising" option={option} selected={ownAnswer === option.value} onPress={chooseOwn} />
                    ))}
                    <Text style={[styles.hint, { color: colors.mutedForeground }]}>Tap an answer to keep going.</Text>
                </View>
            ) : beat === 1 ? (
                <View style={styles.choices}>
                    {OPTIONS.map((option) => (
                        <OnboardingChoiceRow key={option.value} appearance="rising" selectionMode="multiple" option={option} selected={acceptable.includes(option.value)} onPress={toggleAcceptable} />
                    ))}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Select all acceptable partner answers"
                        onPress={() => setAcceptable(OPTIONS.map((item) => item.value))}
                        style={styles.selectAll}
                    >
                        <Text style={[styles.link, { color: colors.primaryText }]}>Any of these works for me</Text>
                    </Pressable>
                </View>
            ) : beat === 2 ? (
                <View style={styles.choices}>
                    {IMPORTANCE.map((option) => (
                        <OnboardingChoiceRow key={option.value} appearance="rising" option={option} selected={importance === option.value} onPress={(value) => { setImportance(value); advance(); }} />
                    ))}
                    <Text style={[styles.hint, { color: colors.mutedForeground }]}>Pick what fits. You can change it later.</Text>
                </View>
            ) : beat === 3 ? (
                <View style={styles.choices}>
                    {VISIBILITY.map((option) => (
                        <OnboardingChoiceRow key={option.value} appearance="rising" option={option} selected={visibility === option.value} onPress={(value) => { setVisibility(value); advance(); }} />
                    ))}
                    <Text style={[styles.hint, { color: colors.mutedForeground }]}>Private answers still help with matching. A comparison shows an answer only when both people share it.</Text>
                </View>
            ) : (
                <View style={styles.choices}>
                    <TextInput
                        accessibilityLabel="Optional context for your answer"
                        value={note}
                        onChangeText={setNote}
                        multiline
                        maxLength={500}
                        textAlignVertical="top"
                        placeholder="Add a note (optional)"
                        placeholderTextColor={colors.mutedForeground}
                        style={[styles.note, { backgroundColor: colors.control, color: colors.foreground, borderColor: colors.controlBorder }]}
                    />
                    <Text style={[styles.hint, { color: colors.mutedForeground }]}>{note.length}/500 · This preview does not send data.</Text>
                </View>
            )}
        </OnboardingScreenShell>
    );
}

const styles = StyleSheet.create({
    choices: { gap: SPACING.compact },
    hint: { ...TYPOGRAPHY.caption, textAlign: 'center', marginTop: SPACING.compact },
    selectAll: { minHeight: HEIGHTS.touchMin, alignItems: 'center', justifyContent: 'center' },
    link: { ...TYPOGRAPHY.body, fontWeight: '600' },
    note: { minHeight: 128, borderWidth: 1, borderRadius: RADIUS.row, padding: SPACING.base, ...TYPOGRAPHY.body },
    skeleton: { height: 64, borderRadius: RADIUS.row },
});
