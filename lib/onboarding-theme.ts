import { useMemo } from 'react';

import { useTheme } from '@/hooks/use-theme';
import { Palette } from '@/lib/design-tokens';

export const ONBOARDING_PHASE_COUNT = 4;

/** Macro phases for segmented progress (steps 0–7). */
export function getOnboardingPhase(stepIndex: number): number {
    if (stepIndex <= 2) return 0;
    if (stepIndex === 3) return 1;
    if (stepIndex === 4) return 2;
    return 3;
}

export const OnboardingSurfaces = {
    light: {
        background: Palette.light.background,
        surface: Palette.light.card,
        surfaceMuted: Palette.light.secondary,
        foreground: Palette.light.foreground,
        mutedForeground: Palette.light.mutedForeground,
        border: Palette.light.border,
        primary: Palette.light.primary,
        primaryForeground: Palette.light.primaryForeground,
        primaryHover: '#C93B6E',
        primarySoft: 'rgba(184, 50, 122, 0.1)',
        track: Palette.light.muted,
        disabled: Palette.light.muted,
    },
    dark: {
        background: '#0E0B1A',
        surface: '#1C1724',
        surfaceMuted: Palette.dark.card,
        foreground: Palette.dark.foreground,
        mutedForeground: Palette.dark.mutedForeground,
        border: Palette.dark.border,
        primary: Palette.dark.primary,
        primaryForeground: Palette.dark.primaryForeground,
        primaryHover: Palette.dark.primaryHover,
        primarySoft: 'rgba(217, 74, 143, 0.18)',
        track: '#2A2433',
        disabled: Palette.dark.muted,
    },
} as const;

export type OnboardingSurfaceTokens =
    | (typeof OnboardingSurfaces)['light']
    | (typeof OnboardingSurfaces)['dark'];

/** @deprecated Use OnboardingSurfaceTokens */
export type OnboardingSurfaces = (typeof OnboardingSurfaces)['light'];

export type OnboardingTheme = OnboardingSurfaceTokens & {
    isDark: boolean;
};

export function withOnboardingAlpha(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    if (normalized.length !== 6) {
        return hex;
    }
    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useOnboardingTheme() {
    const { colorScheme } = useTheme();

    return useMemo(
        () => ({
            ...(colorScheme === 'dark' ? OnboardingSurfaces.dark : OnboardingSurfaces.light),
            isDark: colorScheme === 'dark',
        }),
        [colorScheme],
    );
}
