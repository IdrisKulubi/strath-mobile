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
import { Bell, Heart, InstagramLogo, ShareNetwork, Sparkle } from 'phosphor-react-native';

import { useProfile } from '@/hooks/use-profile';
import { getProfileRoute, isWaitlisted } from '@/lib/profile-access';

const INSTAGRAM_URL = 'https://instagram.com/strathspace';

const TIER_COPY: Record<
    NonNullable<NonNullable<ReturnType<typeof useProfile>['data']>['waitlist']>['tier'],
    { headline: string; eta: string }
> = {
    imminent: {
        headline: "You're next!",
        eta: 'Minutes away — keep notifications on',
    },
    soon: {
        headline: 'You\'re up soon',
        eta: 'Usually within a day',
    },
    first_wave: {
        headline: "You're in the first wave",
        eta: 'A few days at most',
    },
    early_access: {
        headline: "You're on the early-access list",
        eta: "We'll let you in as soon as a spot opens",
    },
};

export default function WaitlistScreen() {
    const router = useRouter();
    const { data: profile, isLoading, refetch, isRefetching } = useProfile();

    // If the user lands here already admitted (e.g. they got the "you're in"
    // push while the screen was open), bounce them to the right place.
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
    const tierCopy = useMemo(
        () => (waitlist ? TIER_COPY[waitlist.tier] : null),
        [waitlist],
    );

    const handleFollowInstagram = useCallback(async () => {
        await Haptics.selectionAsync().catch(() => {});
        Linking.openURL(INSTAGRAM_URL).catch((err) => console.warn('Could not open IG:', err));
    }, []);

    const handleShare = useCallback(async () => {
        await Haptics.selectionAsync().catch(() => {});
        try {
            await Share.share({
                message:
                    "I just joined Strathspace ✨ — it's invite-only right now. Join the waitlist with me: https://strathspace.com",
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
                            tintColor="#f9a8d4"
                            title="Checking your spot..."
                            titleColor="rgba(255,255,255,0.5)"
                        />
                    }
                >
                    <View style={styles.sparkleRow}>
                        <Sparkle size={18} color="#f9a8d4" weight="fill" />
                        <Sparkle size={12} color="#c4b5fd" weight="fill" />
                        <Sparkle size={22} color="#f9a8d4" weight="fill" />
                    </View>

                    <Text style={styles.headline}>You&apos;re on the list</Text>

                    <Text style={styles.intro}>
                        We&apos;re letting people in a few at a time, so every match actually feels
                        right. You&apos;ll be in super soon — we promise.
                    </Text>

                    {tierCopy && (
                        <View style={styles.positionCard}>
                            <View style={styles.positionIcon}>
                                <Heart size={22} color="#f9a8d4" weight="fill" />
                            </View>
                            <View style={styles.positionBody}>
                                <Text style={styles.positionHeadline}>{tierCopy.headline}</Text>
                                <Text style={styles.positionEta}>{tierCopy.eta}</Text>
                            </View>
                        </View>
                    )}

                    <View style={styles.notificationHint}>
                        <Bell size={16} color="rgba(255,255,255,0.7)" weight="fill" />
                        <Text style={styles.notificationText}>
                            We&apos;ll send you a notification the moment it&apos;s your turn.
                        </Text>
                    </View>

                    <View style={styles.ctaGroup}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.cta,
                                styles.ctaPrimary,
                                pressed && styles.ctaPressed,
                            ]}
                            onPress={handleFollowInstagram}
                            accessibilityRole="button"
                            accessibilityLabel="Follow Strathspace on Instagram"
                        >
                            <InstagramLogo size={20} color="#fff" weight="fill" />
                            <Text style={styles.ctaText}>Follow us on Instagram</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.cta,
                                styles.ctaSecondary,
                                pressed && styles.ctaPressed,
                            ]}
                            onPress={handleShare}
                            accessibilityRole="button"
                            accessibilityLabel="Share with a friend"
                        >
                            <ShareNetwork size={20} color="#fff" weight="regular" />
                            <Text style={styles.ctaText}>Tell a friend</Text>
                        </Pressable>
                    </View>

                    <Text style={styles.footer}>
                        Pull down to refresh · Check back anytime
                    </Text>
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
        paddingHorizontal: 28,
        paddingTop: 48,
        paddingBottom: 48,
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1a0b2e',
    },
    sparkleRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 24,
    },
    headline: {
        fontSize: 34,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    intro: {
        marginTop: 16,
        fontSize: 16,
        lineHeight: 24,
        color: 'rgba(255,255,255,0.75)',
        textAlign: 'center',
        paddingHorizontal: 8,
    },
    positionCard: {
        marginTop: 36,
        padding: 20,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderWidth: 1,
        borderColor: 'rgba(249,168,212,0.25)',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    positionIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(249,168,212,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    positionBody: {
        flex: 1,
    },
    positionHeadline: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    positionEta: {
        marginTop: 2,
        fontSize: 13,
        color: 'rgba(255,255,255,0.65)',
    },
    notificationHint: {
        marginTop: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingHorizontal: 16,
    },
    notificationText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.7)',
        textAlign: 'center',
    },
    ctaGroup: {
        marginTop: 36,
        gap: 12,
    },
    cta: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 16,
        borderRadius: 14,
    },
    ctaPrimary: {
        backgroundColor: '#db2777',
    },
    ctaSecondary: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.15)',
    },
    ctaPressed: {
        opacity: 0.85,
        transform: [{ scale: 0.99 }],
    },
    ctaText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
    },
    footer: {
        marginTop: 32,
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        textAlign: 'center',
    },
});
