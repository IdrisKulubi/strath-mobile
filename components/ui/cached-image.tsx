import React, { useState, useCallback } from 'react';
import { Image, ImageStyle, StyleProp, View, StyleSheet } from 'react-native';
import { Image as ExpoImage, ImageContentFit } from 'expo-image';
import { useTheme } from '@/hooks/use-theme';
import { User } from 'phosphor-react-native';

// Default fallback for profile/avatar images
const DEFAULT_AVATAR = 'https://api.dicebear.com/7.x/avataaars/png?seed=fallback';
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=400&fit=crop';

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
 * Handles:
 * - Invalid/missing URIs
 * - Failed image loads (utfs.io expired links, network errors)
 * - Provides appropriate fallback based on image type
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
    const [hasError, setHasError] = useState(false);

    const handleError = useCallback(() => {
        console.log('[CachedImage] Failed to load:', uri?.substring(0, 50));
        setHasError(true);
    }, [uri]);

    // Determine the source to use
    const getSource = () => {
        if (!uri || hasError) {
            switch (fallbackType) {
                case 'avatar':
                    return DEFAULT_AVATAR;
                case 'cover':
                    return DEFAULT_COVER;
                default:
                    return DEFAULT_AVATAR;
            }
        }
        return uri;
    };

    const source = getSource();

    // If no valid source and it's an avatar type, show placeholder icon
    if (!uri && fallbackType === 'avatar') {
        return (
            <View style={[style, styles.placeholder, { backgroundColor: colors.muted }]}>
                <User size={24} color={colors.mutedForeground} weight="fill" />
            </View>
        );
    }

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
