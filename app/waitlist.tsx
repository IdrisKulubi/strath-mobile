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
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { InstagramLogo, ShareNetwork, TiktokLogo } from 'phosphor-react-native';

import { useProfile } from '@/hooks/use-profile';
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
        Linking.openURL(INSTAGRAM_URL).catch((err) => console.warn('Could not open IG:', err));
    }, []);

    const handleFollowTiktok = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        Linking.openURL(TIKTOK_URL).catch((err) => console.warn('Could not open TikTok:', err));
    }, []);

    const handleShare = useCallback(async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        try {
            await Share.share({
                message:
                    "I'm on the waitlist for Strathspace. Join me: https://strathspace.com",
            });
        } catch (err) {
            console.warn('Share failed:', err);
        }
    }, []);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#f9a8d4" />
            </View>
        );
    }

    return (
        <View style={styles.root}>
            <LinearGradient
                colors={['#1a0b2e', '#2d1b4e', '#1a0b2e']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={styles.safe}>
                <ScrollView
                    contentContainerStyle={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={refetch}
                            tintColor="#ffffff"
                        />
                    }
                >
                    <View style={styles.headerContainer}>
                        <Text style={styles.headline}>You&apos;re on the list.</Text>
                        <Text style={styles.subtitle}>
                            We&apos;re letting people in slowly to ensure every match feels right. 
                            We&apos;ll notify you the moment it&apos;s your turn.
                        </Text>
                    </View>

                    {tierCopy && (
                        <View style={styles.card}>
                            <Text style={styles.cardHeadline}>{tierCopy.headline}</Text>
                            <Text style={styles.cardEta}>{tierCopy.eta}</Text>
                        </View>
                    )}

                    <View style={styles.actions}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.socialBtn,
                                pressed && styles.btnPressed,
                            ]}
                            onPress={handleFollowInstagram}
                        >
                            <View style={styles.btnContent}>
                                <InstagramLogo size={22} color="#fff" weight="regular" />
                                <Text style={styles.btnText}>Follow on Instagram</Text>
                            </View>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.socialBtn,
                                pressed && styles.btnPressed,
                            ]}
                            onPress={handleFollowTiktok}
                        >
                            <View style={styles.btnContent}>
                                <TiktokLogo size={22} color="#fff" weight="regular" />
                                <Text style={styles.btnText}>Follow on TikTok</Text>
                            </View>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.secondaryBtn,
                                pressed && styles.btnPressed,
                            ]}
                            onPress={handleShare}
                        >
                            <View style={styles.btnContent}>
                                <ShareNetwork size={22} color="#fff" weight="regular" />
                                <Text style={styles.secondaryBtnText}>Tell a friend</Text>
                            </View>
                        </Pressable>
                    </View>

                    <Text style={styles.footer}>Pull down to refresh</Text>
                </ScrollView>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#1a0b2e',
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
        backgroundColor: '#1a0b2e',
    },
    headerContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    headline: {
        fontSize: 34,
        fontWeight: '800',
        color: '#ffffff',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        marginTop: 16,
        fontSize: 16,
        lineHeight: 24,
        color: 'rgba(255,255,255,0.75)',
        textAlign: 'center',
        maxWidth: 300,
    },
    card: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 24,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardHeadline: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        letterSpacing: -0.2,
        marginBottom: 6,
    },
    cardEta: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
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
        backgroundColor: '#db2777',
    },
    secondaryBtn: {
        width: '100%',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
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
        color: '#ffffff',
    },
    secondaryBtnText: {
        fontSize: 16,
        fontWeight: '600',
        color: 'rgba(255,255,255,0.9)',
    },
    btnPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.98 }],
    },
    footer: {
        marginTop: 32,
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
    },
});
