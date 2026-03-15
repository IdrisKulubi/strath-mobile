import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Text } from '@/components/ui/text';
import { useTheme } from '@/hooks/use-theme';
import { DateKitTipPill } from './date-kit-tip-pill';

interface DateKitHeroProps {
    onOpenDates: () => void;
    onOpenHome: () => void;
}

export function DateKitHero({ onOpenDates, onOpenHome }: DateKitHeroProps) {
    const { colors, isDark } = useTheme();

    return (
        <LinearGradient
            colors={
                isDark
                    ? ['rgba(233,30,140,0.28)', 'rgba(61,36,89,0.95)']
                    : ['#ffe0f0', '#ffffff']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.wrap, { borderColor: colors.border }]}
        >
            <View style={styles.topRow}>
                <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : '#fff' }]}>
                    <Ionicons name="sparkles" size={22} color={colors.primary} />
                </View>
                <DateKitTipPill label="Match to date playbook" icon="book-outline" />
            </View>

            <Text style={[styles.title, { color: colors.foreground }]}>
                Date Kit
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                The part of Strathspace that helps you go from a good match to a real date without overthinking every step.
            </Text>

            <View style={styles.pillRow}>
                <DateKitTipPill label="How it works" icon="git-network-outline" />
                <DateKitTipPill label="Invite tips" icon="paper-plane-outline" />
                <DateKitTipPill label="Vibe check prep" icon="videocam-outline" />
            </View>

            <View style={styles.ctaRow}>
                <Pressable
                    onPress={onOpenDates}
                    style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                >
                    <Ionicons name="calendar-outline" size={16} color="#fff" />
                    <Text style={styles.primaryBtnText}>Open Dates</Text>
                </Pressable>
                <Pressable
                    onPress={onOpenHome}
                    style={[
                        styles.secondaryBtn,
                        {
                            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#fff',
                            borderColor: colors.border,
                        },
                    ]}
                >
                    <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>
                        Go Home
                    </Text>
                </Pressable>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    wrap: {
        marginHorizontal: 16,
        marginTop: 6,
        borderRadius: 28,
        borderWidth: 1,
        padding: 20,
        gap: 14,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
    },
    iconWrap: {
        width: 46,
        height: 46,
        borderRadius: 23,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 30,
        fontWeight: '800',
        letterSpacing: -0.8,
        lineHeight: 36,
        paddingTop: 2,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 21,
    },
    pillRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    ctaRow: {
        flexDirection: 'row',
        gap: 10,
    },
    primaryBtn: {
        flex: 1,
        minHeight: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
    },
    secondaryBtn: {
        minHeight: 48,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 16,
        borderWidth: 1,
    },
    primaryBtnText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    secondaryBtnText: {
        fontSize: 15,
        fontWeight: '700',
    },
});
