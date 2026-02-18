import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
    View,
    TextInput,
    StyleSheet,
    Pressable,
    Keyboard,
    ActivityIndicator,
    Platform,
} from 'react-native';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withSpring,
    interpolateColor,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { MagnifyingGlass, Microphone, PaperPlaneTilt, X, Sparkle, ClockCounterClockwise } from 'phosphor-react-native';
import * as Haptics from 'expo-haptics';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface WingmanSearchBarProps {
    onSearch: (query: string) => void;
    onVoicePress: () => void;
    isSearching: boolean;
    isRecording: boolean;
    placeholder?: string;
    initialQuery?: string;
    greeting?: string | null;
    onHistoryPress?: () => void;
}

const SUGGESTIONS = [
    "someone chill who loves music 🎵",
    "a gym bro who's also funny 💪",
    "creative artsy soul 🎨",
    "deep thinker who reads a lot 📚",
    "adventurous person for road trips ✈️",
    "someone ambitious and driven 🚀",
];

export function WingmanSearchBar({
    onSearch,
    onVoicePress,
    isSearching,
    isRecording,
    placeholder = "Ask your wingman...",
    initialQuery,
    greeting,
    onHistoryPress,
}: WingmanSearchBarProps) {
    const { colors, colorScheme } = useTheme();
    const isDark = colorScheme === 'dark';
    const [query, setQuery] = useState(initialQuery || '');
    const [isFocused, setIsFocused] = useState(false);

    // Sync initialQuery prop (e.g. from voice transcript) into the text input
    useEffect(() => {
        if (initialQuery && initialQuery.length > 0) {
            setQuery(initialQuery);
            setShowSuggestions(false);
        }
    }, [initialQuery]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const inputRef = useRef<TextInput>(null);

    // Animation values
    const focusProgress = useSharedValue(0);
    const pulseScale = useSharedValue(1);

    useEffect(() => {
        focusProgress.value = withSpring(isFocused ? 1 : 0, { damping: 20, stiffness: 200 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isFocused]);

    // Pulse animation for recording state
    useEffect(() => {
        if (isRecording) {
            pulseScale.value = withSpring(1.1, { damping: 5, stiffness: 100 }, () => {
                pulseScale.value = withSpring(1, { damping: 5, stiffness: 100 });
            });
        } else {
            pulseScale.value = withSpring(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isRecording]);

    const containerStyle = useAnimatedStyle(() => ({
        borderColor: interpolateColor(
            focusProgress.value,
            [0, 1],
            [isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
             isDark ? '#e91e8c' : '#e91e8c']
        ),
        transform: [{ scale: withSpring(isFocused ? 1.01 : 1, { damping: 20 }) }],
    }));

    const micButtonStyle = useAnimatedStyle(() => ({
        transform: [{ scale: pulseScale.value }],
    }));

    const handleSubmit = useCallback(() => {
        const trimmed = query.trim();
        if (trimmed.length === 0) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Keyboard.dismiss();
        setShowSuggestions(false);
        onSearch(trimmed);
    }, [query, onSearch]);

    const handleSuggestionPress = useCallback((suggestion: string) => {
        // Strip emoji from suggestion for the query
        const cleanQuery = suggestion.replace(/[\p{Emoji}\p{Emoji_Presentation}]/gu, '').trim();
        setQuery(cleanQuery);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setShowSuggestions(false);
        Keyboard.dismiss();
        onSearch(cleanQuery);
    }, [onSearch]);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        if (query.length === 0) setShowSuggestions(true);
    }, [query]);

    const handleBlur = useCallback(() => {
        setIsFocused(false);
        setTimeout(() => setShowSuggestions(false), 200);
    }, []);

    const handleClear = useCallback(() => {
        setQuery('');
        inputRef.current?.focus();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }, []);

    return (
        <View style={styles.wrapper}>
            {/* Wingman label row */}
            <View style={styles.labelRow}>
                <View style={styles.labelLeft}>
                    <Sparkle size={14} color={colors.primary} weight="fill" />
                    <Text style={[styles.label, { color: colors.primary }]}>
                        AI Wingman
                    </Text>
                </View>
                {onHistoryPress && (
                    <Pressable onPress={onHistoryPress} hitSlop={8} style={styles.historyButton}>
                        <ClockCounterClockwise size={16} color={colors.mutedForeground} />
                    </Pressable>
                )}
            </View>

            {/* Proactive / personalised greeting */}
            {greeting ? (
                <Animated.View
                    entering={FadeIn.duration(400)}
                    exiting={FadeOut.duration(200)}
                    style={[styles.greetingBubble, {
                        backgroundColor: isDark ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.06)',
                        borderColor: isDark ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.15)',
                    }]}
                >
                    <Text style={[styles.greetingText, { color: colors.foreground }]}>
                        {greeting}
                    </Text>
                </Animated.View>
            ) : null}

            {/* Search bar */}
            <Animated.View style={[
                styles.container,
                {
                    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f5f5f5',
                    borderWidth: 1.5,
                },
                containerStyle,
            ]}>
                <MagnifyingGlass
                    size={20}
                    color={isFocused ? colors.primary : colors.mutedForeground}
                    weight={isFocused ? 'bold' : 'regular'}
                    style={styles.searchIcon}
                />

                <TextInput
                    ref={inputRef}
                    style={[styles.input, { color: colors.foreground }]}
                    value={query}
                    onChangeText={(text) => {
                        setQuery(text);
                        if (text.length === 0) setShowSuggestions(true);
                        else setShowSuggestions(false);
                    }}
                    placeholder={placeholder}
                    placeholderTextColor={colors.mutedForeground}
                    onSubmitEditing={handleSubmit}
                    returnKeyType="search"
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    editable={!isRecording}
                    multiline={false}
                    autoCapitalize="none"
                    autoCorrect
                />

                {/* Clear button */}
                {query.length > 0 && !isSearching && (
                    <Animated.View entering={FadeIn.duration(150)} exiting={FadeOut.duration(150)}>
                        <Pressable onPress={handleClear} style={styles.clearButton} hitSlop={8}>
                            <X size={16} color={colors.mutedForeground} />
                        </Pressable>
                    </Animated.View>
                )}

                {/* Loading spinner */}
                {isSearching && (
                    <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
                )}

                {/* Voice / Send button */}
                {query.length > 0 ? (
                    <Pressable
                        onPress={handleSubmit}
                        disabled={isSearching}
                        style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    >
                        <PaperPlaneTilt size={18} color="#fff" weight="fill" />
                    </Pressable>
                ) : (
                    <AnimatedPressable
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onVoicePress();
                        }}
                        disabled={isSearching}
                        style={[
                            styles.actionButton,
                            {
                                backgroundColor: isRecording ? '#ef4444' : colors.primary,
                            },
                            micButtonStyle,
                        ]}
                    >
                        <Microphone
                            size={18}
                            color="#fff"
                            weight={isRecording ? 'fill' : 'bold'}
                        />
                    </AnimatedPressable>
                )}
            </Animated.View>

            {/* Suggestions dropdown */}
            {showSuggestions && !isSearching && (
                <Animated.View
                    entering={FadeIn.duration(200)}
                    exiting={FadeOut.duration(150)}
                    style={[styles.suggestions, {
                        backgroundColor: isDark ? '#2d1b47' : '#fff',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    }]}
                >
                    <Text style={[styles.suggestionsTitle, { color: colors.mutedForeground }]}>
                        Try asking...
                    </Text>
                    {SUGGESTIONS.map((suggestion, i) => (
                        <Pressable
                            key={i}
                            onPress={() => handleSuggestionPress(suggestion)}
                            style={({ pressed }) => [
                                styles.suggestionItem,
                                {
                                    backgroundColor: pressed
                                        ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)')
                                        : 'transparent',
                                },
                            ]}
                        >
                            <Text style={[styles.suggestionText, { color: colors.foreground }]}>
                                {suggestion}
                            </Text>
                        </Pressable>
                    ))}
                </Animated.View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: 16,
        zIndex: 100,
    },
    labelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
        paddingLeft: 4,
    },
    labelLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 16,
        paddingTop: 1,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    historyButton: {
        padding: 4,
    },
    greetingBubble: {
        borderWidth: 1,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 9,
        marginBottom: 10,
    },
    greetingText: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingLeft: 14,
        paddingRight: 6,
        height: 52,
        gap: 8,
    },
    searchIcon: {
        marginRight: 2,
    },
    input: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
        paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    },
    clearButton: {
        padding: 4,
    },
    spinner: {
        marginRight: 4,
    },
    actionButton: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    suggestions: {
        marginTop: 8,
        borderRadius: 16,
        borderWidth: 1,
        paddingVertical: 8,
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    suggestionsTitle: {
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 16,
        paddingVertical: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    suggestionItem: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        marginHorizontal: 4,
    },
    suggestionText: {
        fontSize: 14,
        fontWeight: '500',
    },
});
