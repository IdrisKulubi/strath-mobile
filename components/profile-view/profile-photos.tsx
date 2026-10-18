import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { CachedImage } from '@/components/ui/cached-image';
import { Text } from '@/components/ui/text';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export function getProfilePhotoHeight() {
    return Math.round(Math.min(580, Math.max(460, SCREEN_HEIGHT * 0.58)));
}

interface ProfileHeroIdentity {
    nameLine: string;
    subtitle?: string | null;
}

interface ProfilePhotosProps {
    photos: (string | undefined | null)[];
    onBack?: () => void;
    onPhotoPress?: (uri: string) => void;
    heroIdentity?: ProfileHeroIdentity;
}

export function ProfilePhotos({ photos, onBack, onPhotoPress, heroIdentity }: ProfilePhotosProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const photoHeight = useMemo(() => getProfilePhotoHeight(), []);

    const validPhotos = photos.filter(Boolean) as string[];
    const displayPhotos = validPhotos.length > 0 ? validPhotos : [undefined];
    const hasHero = Boolean(heroIdentity);

    const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { x: number } } }) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(idx);
    }, []);

    return (
        <View style={[styles.container, { height: photoHeight }]}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
            >
                {displayPhotos.map((photo, i) => (
                    <View key={i} style={[styles.photoSlide, { width: SCREEN_WIDTH, height: photoHeight }]}>
                        {photo ? (
                            <Pressable
                                style={styles.photo}
                                onPress={() => onPhotoPress?.(photo)}
                            >
                                <CachedImage
                                    uri={photo}
                                    style={styles.photo}
                                    contentFit="cover"
                                />
                            </Pressable>
                        ) : (
                            <View style={[styles.photo, styles.photoFallback, { backgroundColor: colors.muted }]}>
                                <Ionicons name="person-circle-outline" size={96} color={colors.mutedForeground} />
                            </View>
                        )}
                    </View>
                ))}
            </ScrollView>

            {hasHero ? (
                <LinearGradient
                    pointerEvents="none"
                    colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.82)']}
                    locations={[0, 0.45, 1]}
                    style={styles.heroGradient}
                />
            ) : null}

            {onBack ? (
                <Pressable
                    onPress={onBack}
                    style={[
                        styles.backBtn,
                        {
                            backgroundColor: 'rgba(0,0,0,0.32)',
                            top: Math.max(insets.top, 12) + 8,
                        },
                    ]}
                    hitSlop={8}
                >
                    <Ionicons name="chevron-back" size={22} color="#fff" />
                </Pressable>
            ) : null}

            {displayPhotos.length > 1 ? (
                <View style={[styles.dots, hasHero && styles.dotsWithHero]}>
                    {displayPhotos.map((_, i) => (
                        <View
                            key={i}
                            style={[
                                styles.dot,
                                {
                                    backgroundColor: i === activeIndex ? '#fff' : 'rgba(255,255,255,0.45)',
                                    width: i === activeIndex ? 20 : 6,
                                },
                            ]}
                        />
                    ))}
                </View>
            ) : null}

            {heroIdentity ? (
                <View pointerEvents="none" style={styles.heroContent}>
                    <Text style={styles.heroName}>{heroIdentity.nameLine}</Text>
                    {heroIdentity.subtitle ? (
                        <Text style={styles.heroSubtitle}>{heroIdentity.subtitle}</Text>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'relative',
    },
    photoSlide: {
        width: SCREEN_WIDTH,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroGradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 220,
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        width: 38,
        height: 38,
        borderRadius: 19,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dots: {
        position: 'absolute',
        bottom: 16,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 5,
    },
    dotsWithHero: {
        bottom: 92,
    },
    dot: {
        height: 6,
        borderRadius: 3,
    },
    heroContent: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 22,
        gap: 4,
    },
    heroName: {
        color: '#fff',
        fontSize: 28,
        fontWeight: '700',
        letterSpacing: -0.4,
        lineHeight: 34,
    },
    heroSubtitle: {
        color: 'rgba(255,255,255,0.88)',
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '500',
    },
});
