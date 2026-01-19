import React from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TextInput,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import Animated, { FadeIn } from 'react-native-reanimated';

interface Phase6AboutMeProps {
    aboutMe: string;
    onUpdate: (text: string) => void;
    isDark: boolean;
}

export function Phase6AboutMe({
    aboutMe,
    onUpdate,
    isDark,
}: Phase6AboutMeProps) {
    const { colors } = useTheme();

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
        >
            {/* Header */}
            <Animated.View entering={FadeIn}>
                <Text style={[styles.title, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                    Tell us about yourself
                </Text>
                <Text
                    style={[styles.subtitle, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                >
                    Share what makes you unique in your own words
                </Text>
            </Animated.View>

            {/* Bio Input */}
            <Animated.View
                entering={FadeIn.delay(100)}
                style={[
                    styles.bioCard,
                    {
                        backgroundColor: isDark
                            ? 'rgba(255, 255, 255, 0.04)'
                            : 'rgba(0, 0, 0, 0.03)',
                        borderColor: isDark
                            ? 'rgba(255, 255, 255, 0.08)'
                            : 'rgba(0, 0, 0, 0.06)',
                    },
                ]}
            >
                <TextInput
                    style={[
                        styles.bioInput,
                        {
                            color: isDark ? '#fff' : '#1a1a2e',
                            borderColor: isDark
                                ? 'rgba(255, 255, 255, 0.12)'
                                : 'rgba(0, 0, 0, 0.1)',
                            backgroundColor: isDark
                                ? 'rgba(255, 255, 255, 0.06)'
                                : 'rgba(0, 0, 0, 0.02)',
                        },
                    ]}
                    placeholder="Write something about yourself... hobbies, interests, goals, quirks, anything!"
                    placeholderTextColor={isDark ? '#64748b' : '#9ca3af'}
                    value={aboutMe}
                    onChangeText={onUpdate}
                    multiline
                    maxLength={500}
                    textAlignVertical="top"
                />
                <Text
                    style={[
                        styles.characterCount,
                        {
                            color: isDark ? '#64748b' : '#9ca3af',
                        },
                    ]}
                >
                    {aboutMe.length}/500
                </Text>
            </Animated.View>

            {/* Tips */}
            <Animated.View entering={FadeIn.delay(150)} style={styles.tipsContainer}>
                <Text style={[styles.tipsTitle, { color: isDark ? '#fff' : '#1a1a2e' }]}>
                    💡 Tips
                </Text>
                <View style={styles.tipItem}>
                    <Text
                        style={[styles.tipText, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                    >
                        • Be authentic - people love genuine personalities
                    </Text>
                </View>
                <View style={styles.tipItem}>
                    <Text
                        style={[styles.tipText, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                    >
                        • Mention your passions and what excites you
                    </Text>
                </View>
                <View style={styles.tipItem}>
                    <Text
                        style={[styles.tipText, { color: isDark ? '#94a3b8' : '#6b7280' }]}
                    >
                        • Show some personality with emojis and humor!
                    </Text>
                </View>
            </Animated.View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingHorizontal: 20,
    },
    contentContainer: {
        paddingVertical: 30,
        paddingBottom: 100,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 8,
        lineHeight: 32,
    },
    subtitle: {
        fontSize: 15,
        marginBottom: 28,
        lineHeight: 22,
    },
    bioCard: {
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        marginBottom: 28,
    },
    bioInput: {
        borderRadius: 12,
        padding: 14,
        borderWidth: 1,
        fontSize: 15,
        minHeight: 200,
        marginBottom: 12,
    },
    characterCount: {
        fontSize: 12,
        textAlign: 'right',
    },
    tipsContainer: {
        backgroundColor: 'rgba(236, 72, 153, 0.08)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(236, 72, 153, 0.15)',
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    tipItem: {
        marginBottom: 10,
    },
    tipText: {
        fontSize: 14,
        lineHeight: 20,
    },
});
