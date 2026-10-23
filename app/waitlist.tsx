import React, { useCallback, useEffect, useMemo } from 'react';
import {
    ActivityIndicator,
    Linking,
    Pressable,
    RefreshControl,
    SafeAreaView,
    ScrollView,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { InstagramLogo, ShareNetwork, TiktokLogo } from 'phosphor-react-native';

import { useProfile } from '@/hooks/use-profile';
import { useTheme } from '@/hooks/use-theme';
import { getProfileRoute, isWaitlisted } from '@/lib/profile-access';

const INSTAGRAM_URL = 'https://instagram.com/strathspace';
const TIKTOK_URL = 'https://tiktok.com/@strathspace';

const TIER_COPY: Record<
    NonNullable<NonNullable<ReturnType<typeof useProfile>['data']>['waitlist']>['tier'],
    { headline: string; eta: string }
> = {
    imminent: {
        headline: "You're next in line",
        eta: 'Just a few minutes away',
    },
    soon: {
        headline: "You're almost there",
        eta: 'Typically within 24 hours',
    },
    first_wave: {
        headline: "You're in the first wave",
        eta: 'A couple of days at most',
    },
    early_access: {
        headline: "You're on the list",
        eta: "We'll get you in as soon as we can",
    },
};

export default function WaitlistScreen() {
    const router = useRouter();
    const { colors } = useTheme();
    const { data: profile, isLoading, refetch, isRefetching } = useProfile();

    useEffect(() => {
        if (!profile) return;
        if (!isWaitlisted(profile)) {
            const next = getProfileRoute(profile);
            if (next !== '/waitlist') {
                router.replace(next as any);
            }
        }
    }, [profile, router]);

    const waitlist = profile?.waitlist ?? null;
    const tierCopy = useMemo(() => (waitlist ? TIER_COPY[waitlist.tier] : null), [waitlist]);

    const handleFollowInstagram = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        Linking.openURL(INSTAGRAM_URL).catch(() => undefined);
    }, []);

    const handleFollowTiktok = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        Linking.openURL(TIKTOK_URL).catch(() => undefined);
    }, []);

    const handleShare = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        try {
            await Share.share({
                message:
                    "I'm on the waitlist for Strathspace. Join me: https://strathspace.com",
            });
        } catch (err) {
        }
    }, []);

    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.root, { backgroundColor: colors.background }]}>
            <SafeAreaView style={styles.safe}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor={colors.foreground}
                        />
                    }
                >
                    <View style={styles.headerContainer}>
                        <Text style={[styles.headline, { color: colors.foreground }]}>You&apos;re on the list.</Text>
                        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
                            We&apos;re letting people in slowly to ensure every match feels right. 
                            We&apos;ll notify you the moment it&apos;s your turn.
                        </Text>
                    </View>

                    {tierCopy && (
                        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                            <Text style={[styles.cardHeadline, { color: colors.foreground }]}>{tierCopy.headline}</Text>
                            <Text style={[styles.cardEta, { color: colors.mutedForeground }]}>{tierCopy.eta}</Text>
                        </View>
                    )}

                    <View style={styles.actions}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.socialBtn,
                                { backgroundColor: colors.primary },
                                pressed && styles.btnPressed,
                            ]}
                            onPress={handleFollowInstagram}
                        >
                            <View style={styles.btnContent}>
                                <InstagramLogo size={22} color={colors.primaryForeground} weight="regular" />
                                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Follow on Instagram</Text>
                            </View>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.socialBtn,
                                { backgroundColor: colors.primary },
                                pressed && styles.btnPressed,
                            ]}
                            onPress={handleFollowTiktok}
                        >
                            <View style={styles.btnContent}>
                                <TiktokLogo size={22} color={colors.primaryForeground} weight="regular" />
                                <Text style={[styles.btnText, { color: colors.primaryForeground }]}>Follow on TikTok</Text>
                            </View>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.secondaryBtn,
                                { backgroundColor: colors.muted, borderColor: colors.border },
                                pressed && styles.btnPressed,
                            ]}
                            onPress={handleShare}
                        >
                            <View style={styles.btnContent}>
                                <ShareNetwork size={22} color={colors.foreground} weight="regular" />
                                <Text style={[styles.secondaryBtnText, { color: colors.foreground }]}>Tell a friend</Text>
                            </View>
                        </Pressable>
                    </View>

                    <Text style={[styles.footer, { color: colors.mutedForeground }]}>Pull down to refresh</Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
    },
    safe: {
        flex: 1,
    },
    scroll: {
        flexGrow: 1,
        paddingHorizontal: 32,
        paddingTop: 100,
        paddingBottom: 40,
        alignItems: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    headline: {
        fontSize: 34,
        fontWeight: '800',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        marginTop: 16,
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        maxWidth: 300,
    },
    card: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderRadius: 20,
        borderWidth: 1,
    },
    cardHeadline: {
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
        marginBottom: 6,
    },
    cardEta: {
        fontSize: 15,
    },
    actions: {
        marginTop: 48,
        width: '100%',
        gap: 12,
    },
    socialBtn: {
        width: '100%',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
    },
    secondaryBtn: {
        width: '100%',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        borderWidth: 1,
    },
    btnContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    btnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
    },
    btnPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    footer: {
        marginTop: 32,
        fontSize: 12,
        textAlign: 'center',
    },
});
