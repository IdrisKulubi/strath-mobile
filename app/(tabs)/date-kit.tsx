import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { ScreenGradient } from '@/components/ui/screen-gradient';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DateKitHero } from '@/components/date-kit/date-kit-hero';
import { DateKitSectionCard } from '@/components/date-kit/date-kit-section-card';
import { DateKitTipPill } from '@/components/date-kit/date-kit-tip-pill';

type DateKitFilter = 'all' | 'flow' | 'confidence' | 'starters';

interface DateKitSection {
    id: string;
    category: Exclude<DateKitFilter, 'all'>;
    title: string;
    subtitle: string;
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    steps: string[];
    tips: string[];
}

const FILTERS: { key: DateKitFilter; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'all', label: 'Everything', icon: 'apps-outline' },
    { key: 'flow', label: 'Flow', icon: 'git-network-outline' },
    { key: 'confidence', label: 'Confidence', icon: 'flash-outline' },
    { key: 'starters', label: 'Starters', icon: 'chatbubble-ellipses-outline' },
];

const PLAYBOOK_SECTIONS: DateKitSection[] = [
    {
        id: 'how-it-works',
        category: 'flow',
        title: 'How Strathspace works',
        subtitle: 'From a strong match to a real-world plan.',
        icon: 'git-network-outline',
        accent: '#e91e8c',
        steps: [
            'Home shows your best daily matches instead of endless swiping.',
            'When someone feels right, send a date invite with a vibe that fits the energy.',
            'If the invite is accepted, the connection moves into Dates so both of you know what is happening next.',
            'The whole flow is designed to get you off the app and into a real date faster.',
        ],
        tips: ['No swipe casino', 'Built for real dates', 'Keep it intentional'],
    },
    {
        id: 'send-invite',
        category: 'confidence',
        title: 'Sending a date invite',
        subtitle: 'Confident beats complicated every time.',
        icon: 'paper-plane-outline',
        accent: '#8b5cf6',
        steps: [
            'Pick a vibe that matches how you would actually want the date to feel.',
            'Keep your message short, clear, and low-pressure.',
            'Say enough to feel human, not enough to write an essay.',
            'Once it is sent, relax and let the app do its part instead of double-thinking it.',
        ],
        tips: ['Short message wins', 'Match the vibe', 'No over-explaining'],
    },
    {
        id: 'vibe-check',
        category: 'flow',
        title: 'What happens in vibe check',
        subtitle: 'A quick reality check before the real date energy kicks in.',
        icon: 'videocam-outline',
        accent: '#06b6d4',
        steps: [
            'Vibe check lets you both feel the chemistry before locking in the date.',
            'Come in relaxed, curious, and present instead of trying to perform.',
            'The goal is not to be perfect. The goal is to see if the energy feels easy.',
            'If it clicks, the date setup feels much smoother and more natural.',
        ],
        tips: ['Keep it light', 'Be present', 'Look for ease'],
    },
    {
        id: 'first-date-tips',
        category: 'confidence',
        title: 'First-date moves that actually work',
        subtitle: 'Simple beats forced. Calm beats trying too hard.',
        icon: 'rose-outline',
        accent: '#f59e0b',
        steps: [
            'Show up on time and bring relaxed energy, not pressure.',
            'Ask follow-up questions so the conversation feels like interest, not an interview.',
            'Leave a little mystery. You do not need to say everything on date one.',
            'End clearly and kindly so the next step feels easy for both of you.',
        ],
        tips: ['Ask follow-ups', 'Stay relaxed', 'End clearly'],
    },
    {
        id: 'conversation-starters',
        category: 'starters',
        title: 'Conversation starters',
        subtitle: 'Easy openers when the vibe is good but your brain goes blank.',
        icon: 'chatbubble-ellipses-outline',
        accent: '#10b981',
        steps: [
            'Ask what a perfect low-effort campus day looks like for them.',
            'Use something from their profile instead of a generic compliment.',
            'Talk about music, plans, funniest class moments, or places around campus worth escaping to.',
            'If the chat feels good, suggest a real plan instead of letting it drag forever.',
        ],
        tips: ['Use profile clues', 'Keep it playful', 'Move to a plan'],
    },
];

const QUICK_STARTERS = [
    'What is your ideal low-effort date around campus?',
    'What is one thing on your profile people always ask you about?',
    'Which song would instantly set the vibe for a great date?',
    'What is a random green flag you notice fast?',
    'If we skipped the awkward part, where would we go first?',
    'What kind of energy makes you feel most comfortable on a first date?',
];

export default function DateKitScreen() {
    const router = useRouter();
    const { colors, isDark } = useTheme();
    const [activeFilter, setActiveFilter] = useState<DateKitFilter>('all');
    const [expandedSectionId, setExpandedSectionId] = useState<string>(PLAYBOOK_SECTIONS[0].id);

    const visibleSections = useMemo(() => {
        if (activeFilter === 'all') {
            return PLAYBOOK_SECTIONS;
        }
        return PLAYBOOK_SECTIONS.filter((section) => section.category === activeFilter);
    }, [activeFilter]);

    const handleFilterChange = (nextFilter: DateKitFilter) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setActiveFilter(nextFilter);
        const nextSections = nextFilter === 'all'
            ? PLAYBOOK_SECTIONS
            : PLAYBOOK_SECTIONS.filter((section) => section.category === nextFilter);
        if (nextSections.length > 0) {
            setExpandedSectionId(nextSections[0].id);
        }
    };

    const handleToggleSection = (sectionId: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setExpandedSectionId((current) => current === sectionId ? '' : sectionId);
    };

    return (
        <ScreenGradient edges={['top']} style={styles.container}>
            <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.foreground }]}>
                        Date Kit
                    </Text>
                    <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>
                        A smooth guide for what to do before, during, and after the match energy hits.
                    </Text>
                </View>

                <DateKitHero
                    onOpenDates={() => router.push('/(tabs)/dates')}
                    onOpenHome={() => router.push('/(tabs)')}
                />

                <Animated.View
                    entering={FadeInDown.delay(60).springify().damping(14)}
                    style={[
                        styles.filterWrap,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.92)',
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Text style={[styles.sectionEyebrow, { color: colors.mutedForeground }]}>
                        Pick a lane
                    </Text>
                    <View style={styles.filterRow}>
                        {FILTERS.map((filter) => (
                            <DateKitTipPill
                                key={filter.key}
                                label={filter.label}
                                icon={filter.icon}
                                selected={activeFilter === filter.key}
                                onPress={() => handleFilterChange(filter.key)}
                            />
                        ))}
                    </View>
                </Animated.View>

                <View style={styles.cardsWrap}>
                    {visibleSections.map((section, index) => (
                        <DateKitSectionCard
                            key={section.id}
                            title={section.title}
                            subtitle={section.subtitle}
                            icon={section.icon}
                            accent={section.accent}
                            steps={section.steps}
                            tips={section.tips}
                            expanded={expandedSectionId === section.id}
                            delay={index * 70 + 100}
                            onPress={() => handleToggleSection(section.id)}
                        />
                    ))}
                </View>

                {(activeFilter === 'all' || activeFilter === 'starters') ? (
                    <Animated.View
                        entering={FadeInDown.delay(180).springify().damping(14)}
                        style={[
                            styles.startersPanel,
                            {
                                backgroundColor: isDark ? colors.card : '#fff',
                                borderColor: colors.border,
                            },
                        ]}
                    >
                        <View style={styles.startersHeader}>
                            <View>
                                <Text style={[styles.startersTitle, { color: colors.foreground }]}>
                                    Pocket openers
                                </Text>
                                <Text style={[styles.startersSubtitle, { color: colors.mutedForeground }]}>
                                    Save these for the moments when the conversation needs an easy lift.
                                </Text>
                            </View>
                            <View style={[styles.startersIcon, { backgroundColor: `${colors.primary}18` }]}>
                                <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
                            </View>
                        </View>
                        <View style={styles.startersGrid}>
                            {QUICK_STARTERS.map((prompt) => (
                                <View
                                    key={prompt}
                                    style={[
                                        styles.promptCard,
                                        {
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : colors.secondary,
                                            borderColor: colors.border,
                                        },
                                    ]}
                                >
                                    <Text style={[styles.promptText, { color: colors.foreground }]}>
                                        {prompt}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </Animated.View>
                ) : null}

                <Animated.View
                    entering={FadeInDown.delay(220).springify().damping(14)}
                    style={[
                        styles.footerCard,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#fff',
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Text style={[styles.footerTitle, { color: colors.foreground }]}>
                        The golden rule
                    </Text>
                    <Text style={[styles.footerCopy, { color: colors.mutedForeground }]}>
                        The best energy on this app is clear, calm, and intentional. You do not need to be perfect. You just need to make the next step feel easy.
                    </Text>
                    <Pressable
                        onPress={() => router.push('/(tabs)/dates')}
                        style={[styles.footerBtn, { backgroundColor: colors.primary }]}
                    >
                        <Text style={styles.footerBtnText}>Continue in Dates</Text>
                    </Pressable>
                </Animated.View>
            </ScrollView>
        </ScreenGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingBottom: 32,
        gap: 16,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 12,
        gap: 4,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: -0.6,
        lineHeight: 34,
        paddingTop: 2,
    },
    headerSub: {
        fontSize: 14,
        lineHeight: 20,
    },
    filterWrap: {
        marginHorizontal: 16,
        borderRadius: 22,
        borderWidth: 1,
        padding: 16,
        gap: 12,
    },
    sectionEyebrow: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    filterRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    cardsWrap: {
        paddingHorizontal: 16,
        gap: 12,
    },
    startersPanel: {
        marginHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        padding: 16,
        gap: 14,
    },
    startersHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    startersTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    startersSubtitle: {
        fontSize: 13,
        lineHeight: 18,
        marginTop: 4,
        maxWidth: '90%',
    },
    startersIcon: {
        width: 38,
        height: 38,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    startersGrid: {
        gap: 10,
    },
    promptCard: {
        borderRadius: 18,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 14,
    },
    promptText: {
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
    footerCard: {
        marginHorizontal: 16,
        borderRadius: 24,
        borderWidth: 1,
        padding: 18,
        gap: 10,
    },
    footerTitle: {
        fontSize: 18,
        fontWeight: '800',
    },
    footerCopy: {
        fontSize: 14,
        lineHeight: 21,
    },
    footerBtn: {
        marginTop: 6,
        minHeight: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    footerBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
