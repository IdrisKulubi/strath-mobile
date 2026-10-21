import React, { useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/hooks/use-theme';

interface RisingHeaderProgressiveBlurProps {
    height: number;
}

/** Stacked blur bands plus a theme scrim that dissolves into the sheet (WhatsApp-style). */
export function RisingHeaderProgressiveBlur({ height }: RisingHeaderProgressiveBlurProps) {
    const { colors, isDark } = useTheme();
    const tint = isDark ? 'dark' : 'light';

    const gradientColors = useMemo(
        () => [colors.risingHeaderScrim0, colors.risingHeaderScrim1, colors.risingHeaderScrim2, 'transparent'] as const,
        [colors.risingHeaderScrim0, colors.risingHeaderScrim1, colors.risingHeaderScrim2],
    );

    if (height <= 0) return null;

    return (
        <View pointerEvents="none" style={[styles.host, { height }]}>
            {Platform.OS === 'ios' ? (
                <>
                    <View style={[styles.band, { height: height * 0.38 }]}>
                        <BlurView intensity={52} tint={tint} style={StyleSheet.absoluteFill} />
                    </View>
                    <View style={[styles.band, { height: height * 0.58, top: height * 0.12 }]}>
                        <BlurView intensity={30} tint={tint} style={StyleSheet.absoluteFill} />
                    </View>
                    <View style={[styles.band, { height: height * 0.82, top: height * 0.22 }]}>
                        <BlurView intensity={16} tint={tint} style={StyleSheet.absoluteFill} />
                    </View>
                </>
            ) : null}
            <LinearGradient
                colors={[...gradientColors]}
                locations={[0, 0.34, 0.7, 1]}
                start={{ x: 0.5, y: 0 }}
                end={{ x: 0.5, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    host: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        overflow: 'hidden',
    },
    band: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        overflow: 'hidden',
    },
});
