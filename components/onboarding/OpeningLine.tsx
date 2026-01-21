import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    SlideInUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ChatCircle, PencilSimple, Sparkle, Lightbulb } from 'phosphor-react-native';

interface OpeningLineProps {
    prompts: { promptId: string; response: string }[];
    aboutMe: string;
    onUpdate: (data: { prompts?: { promptId: string; response: string }[]; aboutMe?: string }) => void;
    onComplete: () => void;
}

const PROMPT_OPTIONS = [
    "Two truths and a lie...",
    "The way to my heart is...",
    "My most controversial opinion is...",
    "The best trip I ever took was...",
    "I'm looking for someone who...",
    "My secret talent is...",
    "I geek out on...",
    "A perfect Sunday looks like...",
    "My most irrational fear is...",
    "If I could have dinner with anyone...",
];

const PromptChip = ({
    prompt,
    isSelected,
    onSelect,
    index,
}: {
    prompt: string;
    isSelected: boolean;
    onSelect: () => void;
    index: number;
}) => {
    return (
        <Animated.View entering={FadeInDown.delay(index * 30).springify()}>
            <TouchableOpacity
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onSelect();
                }}
                activeOpacity={0.7}
            >
                <View style={[styles.promptChip, isSelected && styles.promptChipSelected]}>
                    <Text style={[styles.promptChipText, isSelected && styles.promptChipTextSelected]}>
                        {prompt}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

export function OpeningLine({ prompts, aboutMe, onUpdate, onComplete }: OpeningLineProps) {
    const [selectedPrompt, setSelectedPrompt] = useState<string>(prompts[0]?.promptId || '');
    const [answer, setAnswer] = useState(prompts[0]?.response || '');
    const [bio, setBio] = useState(aboutMe || '');
    const [step, setStep] = useState<'prompt' | 'answer' | 'bio'>('prompt');

    const canContinue = step === 'prompt'
        ? !!selectedPrompt
        : step === 'answer'
        ? answer.length >= 10
        : bio.length >= 10;

    const handleSelectPrompt = (prompt: string) => {
        setSelectedPrompt(prompt);
    };

    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        if (step === 'prompt') {
            setStep('answer');
        } else if (step === 'answer') {
            onUpdate({
                prompts: [{ promptId: selectedPrompt, response: answer }],
            });
            setStep('bio');
        } else {
            onUpdate({ aboutMe: bio });
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            onComplete();
        }
    };

    const handleSkip = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (step === 'bio') {
            onComplete();
        } else {
            setStep('bio');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <LinearGradient
                colors={['#0f0d23', '#1a0d2e', '#0f0d23']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Step: Select Prompt */}
                {step === 'prompt' && (
                    <Animated.View entering={FadeIn} style={styles.content}>
                        <View style={styles.iconContainer}>
                            <ChatCircle size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.title}>Choose your opener</Text>
                        <Text style={styles.subtitle}>
                            Pick a prompt that shows off your personality
                        </Text>

                        <View style={styles.promptsContainer}>
                            {PROMPT_OPTIONS.map((prompt, index) => (
                                <PromptChip
                                    key={prompt}
                                    prompt={prompt}
                                    isSelected={selectedPrompt === prompt}
                                    onSelect={() => handleSelectPrompt(prompt)}
                                    index={index}
                                />
                            ))}
                        </View>
                    </Animated.View>
                )}

                {/* Step: Answer Prompt */}
                {step === 'answer' && (
                    <Animated.View entering={SlideInUp.springify()} style={styles.content}>
                        <View style={styles.iconContainer}>
                            <PencilSimple size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.title}>Complete the prompt</Text>
                        
                        <View style={styles.selectedPromptContainer}>
                            <Text style={styles.selectedPromptText}>{selectedPrompt}</Text>
                        </View>

                        <TextInput
                            style={styles.answerInput}
                            placeholder="Your answer here..."
                            placeholderTextColor="#64748b"
                            multiline
                            maxLength={200}
                            value={answer}
                            onChangeText={setAnswer}
                            autoFocus
                        />

                        <View style={styles.charCount}>
                            <Text style={[styles.charCountText, answer.length >= 10 && styles.charCountValid]}>
                                {answer.length}/200
                            </Text>
                            {answer.length < 10 && (
                                <Text style={styles.charCountHint}>Min 10 characters</Text>
                            )}
                        </View>

                        {/* Tip */}
                        <Animated.View entering={FadeIn.delay(300)} style={styles.tipContainer}>
                            <Lightbulb size={18} color="#f59e0b" weight="fill" />
                            <Text style={styles.tipText}>
                                Funny, creative answers get more connections!
                            </Text>
                        </Animated.View>
                    </Animated.View>
                )}

                {/* Step: Bio */}
                {step === 'bio' && (
                    <Animated.View entering={SlideInUp.springify()} style={styles.content}>
                        <View style={styles.iconContainer}>
                            <Sparkle size={32} color="#ec4899" weight="fill" />
                        </View>
                        <Text style={styles.title}>One last thing...</Text>
                        <Text style={styles.subtitle}>
                            Write a short bio that captures who you are
                        </Text>

                        <TextInput
                            style={[styles.answerInput, styles.bioInput]}
                            placeholder="A little about yourself..."
                            placeholderTextColor="#64748b"
                            multiline
                            maxLength={300}
                            value={bio}
                            onChangeText={setBio}
                            autoFocus
                        />

                        <View style={styles.charCount}>
                            <Text style={[styles.charCountText, bio.length >= 10 && styles.charCountValid]}>
                                {bio.length}/300
                            </Text>
                            {bio.length < 10 && (
                                <Text style={styles.charCountHint}>Min 10 characters</Text>
                            )}
                        </View>

                        {/* Example */}
                        <Animated.View entering={FadeIn.delay(300)} style={styles.exampleContainer}>
                            <Text style={styles.exampleLabel}>💡 Example:</Text>
                            <Text style={styles.exampleText}>
                                {`"Third year CS major who spends too much time on Spotify. Always down for coffee and deep convos. Looking for someone to binge anime with 🍿"`}
                            </Text>
                        </Animated.View>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.footer}>
                <TouchableOpacity
                    onPress={handleNext}
                    disabled={!canContinue}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={canContinue ? ['#ec4899', '#f43f5e'] : ['#374151', '#374151']}
                        style={styles.continueButton}
                    >
                        <Text style={[styles.continueButtonText, !canContinue && styles.disabledText]}>
                            {step === 'bio' ? 'Finish' : 'Continue'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>

                {step !== 'prompt' && (
                    <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
                        <Text style={styles.skipText}>Skip for now</Text>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingTop: 60,
    },
    content: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 20,
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#94a3b8',
        marginBottom: 24,
        lineHeight: 24,
    },
    promptsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    promptChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    promptChipSelected: {
        backgroundColor: 'rgba(236, 72, 153, 0.2)',
        borderColor: '#ec4899',
    },
    promptChipText: {
        fontSize: 14,
        color: '#94a3b8',
        fontWeight: '500',
    },
    promptChipTextSelected: {
        color: '#fff',
    },
    selectedPromptContainer: {
        backgroundColor: 'rgba(236, 72, 153, 0.15)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.3)',
    },
    selectedPromptText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f472b6',
    },
    answerInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        minHeight: 120,
        textAlignVertical: 'top',
    },
    bioInput: {
        minHeight: 140,
    },
    charCount: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingHorizontal: 4,
    },
    charCountText: {
        fontSize: 14,
        color: '#64748b',
    },
    charCountValid: {
        color: '#10b981',
    },
    charCountHint: {
        fontSize: 14,
        color: '#f59e0b',
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        padding: 14,
        borderRadius: 12,
        marginTop: 24,
    },
    tipText: {
        fontSize: 14,
        color: '#fbbf24',
        flex: 1,
    },
    exampleContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        padding: 16,
        borderRadius: 16,
        marginTop: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    exampleLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748b',
        marginBottom: 8,
    },
    exampleText: {
        fontSize: 14,
        color: '#94a3b8',
        fontStyle: 'italic',
        lineHeight: 22,
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 40,
        paddingTop: 16,
        gap: 12,
    },
    continueButton: {
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
    },
    disabledText: {
        color: '#6b7280',
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    skipText: {
        fontSize: 16,
        color: '#64748b',
        textDecorationLine: 'underline',
    },
});
