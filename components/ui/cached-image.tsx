import React, { useState, useCallback, useEffect } from 'react';
import { Image, ImageStyle, StyleProp, View, StyleSheet } from 'react-native';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { User } from 'phosphor-react-native';

// Default fallback for profile/avatar images
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/png?seed=fallback';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop';

// ---- Module-level URL validation cache ----
// Prevents re-attempting known-bad URLs across component instances & re-renders.
// ExpoImage.prefetch resolves to boolean (doesn't reject), so we use it to
// validate URLs before passing them to <ExpoImage>, avoiding uncaught native
// promise rejections that spam the console.
const urlCache = new Map<string, boolean>();
const inflightPrefetches = new Map<string, Promise<boolean>>();

function prefetchUrl(url: string): Promise<boolean> {
    const cached = urlCache.get(url);
    if (cached !== undefined) return Promise.resolve(cached);

    const inflight = inflightPrefetches.get(url);
    if (inflight) return inflight;

    const promise = ExpoImage.prefetch(url)
        .then((ok: boolean) => {
            urlCache.set(url, ok);
            inflightPrefetches.delete(url);
            return ok;
        })
        .catch(() => {
            urlCache.set(url, false);
            inflightPrefetches.delete(url);
            return false;
        });

    inflightPrefetches.set(url, promise);
    return promise;
}

function getFallbackUri(type: 'avatar' | 'cover' | 'photo'): string {
    return type === 'cover' ? DEFAULT_COVER : DEFAULT_AVATAR;
}

interface CachedImageProps {
    uri: string | undefined | null;
    style?: StyleProp<ImageStyle>;
    fallbackType?: 'avatar' | 'cover' | 'photo';
    contentFit?: ImageContentFit;
    useExpoImage?: boolean;
    placeholder?: string;
}

/**
 * CachedImage - A robust image component with error handling and fallbacks
 *
 * Validates URLs via ExpoImage.prefetch before rendering so that broken
 * URLs (e.g. expired utfs.io links) never reach <ExpoImage>, preventing
 * uncaught native promise rejections. Validation results are cached
 * module-wide so subsequent renders are instant.
 */
export function CachedImage({
    uri,
    style,
    fallbackType = 'photo',
    contentFit = 'cover',
    useExpoImage = true,
    placeholder,
}: CachedImageProps) {
    const { colors } = useTheme();

    // Resolve initial render state synchronously from cache
    const [imgState, setImgState] = useState<'validating' | 'ready' | 'error'>(() => {
        if (!uri) return 'error';
        const cached = urlCache.get(uri);
        if (cached === true) return 'ready';
        if (cached === false) return 'error';
        return 'validating';
    });

    // Prefetch to validate URL (runs once per unique uri)
    useEffect(() => {
        if (!uri) {
            setImgState('error');
            return;
        }

        const cached = urlCache.get(uri);
        if (cached === true) { setImgState('ready'); return; }
        if (cached === false) { setImgState('error'); return; }

        let cancelled = false;
        prefetchUrl(uri).then((ok) => {
            if (!cancelled) setImgState(ok ? 'ready' : 'error');
        });
        return () => { cancelled = true; };
    }, [uri]);

    // Safety net: if the render-time load still fails, catch it here
    const handleError = useCallback(() => {
        if (uri) urlCache.set(uri, false);
        setImgState('error');
    }, [uri]);

    // ---- Render ----

    // No URI + avatar → icon placeholder
    if (!uri && fallbackType === 'avatar') {
        return (
            <View style={[style, styles.placeholder, { backgroundColor: colors.muted }]}>
                <User size={24} color={colors.mutedForeground} weight="fill" />
            </View>
        );
    }

    // Validating — show a tinted placeholder the same size as the image
    if (imgState === 'validating') {
        return (
            <View style={[style, styles.placeholder, { backgroundColor: colors.muted }]}>
                {fallbackType === 'avatar' && (
                    <User size={24} color={colors.mutedForeground} weight="fill" />
                )}
            </View>
        );
    }

    // Choose source: validated URI or fallback
    const source = imgState === 'error' ? getFallbackUri(fallbackType) : uri!;

    if (useExpoImage) {
        return (
            <ExpoImage
                source={{ uri: source }}
                style={style}
                contentFit={contentFit}
                placeholder={placeholder}
                onError={handleError}
                transition={200}
                cachePolicy="memory-disk"
            />
        );
    }

    return (
        <Image
            source={{ uri: source }}
            style={style}
            resizeMode={contentFit as any}
            onError={handleError}
        />
    );
}

/**
 * ProfileImage - Convenience wrapper for profile/avatar images
 */
export function ProfileImage({
    uri,
    style,
    size = 48,
}: {
    uri: string | undefined | null;
    style?: StyleProp<ImageStyle>;
    size?: number;
}) {
    const defaultStyle: ImageStyle = {
        width: size,
        height: size,
        borderRadius: size / 2,
    };

    return (
        <CachedImage
            uri={uri}
            style={[defaultStyle, style]}
            fallbackType="avatar"
            contentFit="cover"
        />
    );
}

/**
 * CoverImage - Convenience wrapper for cover/banner images
 */
export function CoverImage({
    uri,
    style,
}: {
    uri: string | undefined | null;
    style?: StyleProp<ImageStyle>;
}) {
    return (
        <CachedImage
            uri={uri}
            style={style}
            fallbackType="cover"
            contentFit="cover"
        />
    );
}

const styles = StyleSheet.create({
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
});
