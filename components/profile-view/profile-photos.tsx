import React, { useCallback, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions, Pressable } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CachedImage } from '@/components/ui/cached-image';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/use-theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PHOTO_HEIGHT = 420;

interface ProfilePhotosProps {
    photos: (string | undefined | null)[];
    onBack?: () => void;
    onPhotoPress?: (uri: string) => void;
}

export function ProfilePhotos({ photos, onBack, onPhotoPress }: ProfilePhotosProps) {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const [activeIndex, setActiveIndex] = useState(0);
    const scrollRef = useRef<ScrollView>(null);

    const validPhotos = photos.filter(Boolean) as string[];
    const displayPhotos = validPhotos.length > 0 ? validPhotos : [undefined];

    const handleScroll = useCallback((e: any) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
        setActiveIndex(idx);
    }, []);

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                scrollEventThrottle={16}
            >
                {displayPhotos.map((photo, i) => (
                    <View key={i} style={styles.photoSlide}>
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

            {/* Back button */}
            {onBack && (
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
            )}

            {/* Dot indicators */}
            {displayPhotos.length > 1 && (
                <View style={styles.dots}>
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
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        height: PHOTO_HEIGHT,
        position: 'relative',
    },
    photoSlide: {
        width: SCREEN_WIDTH,
        height: PHOTO_HEIGHT,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoFallback: {
        alignItems: 'center',
        justifyContent: 'center',
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
    dot: {
        height: 6,
        borderRadius: 3,
    },
});
