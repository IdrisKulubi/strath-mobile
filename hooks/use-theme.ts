/**
 * Custom hook to access theme colors easily
 * 
 * Usage:
 * const { colors } = useTheme();
 * const backgroundColor = colors.background;
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export function useTheme() {
    const colorScheme = useColorScheme() ?? 'light';
    const colors = Colors[colorScheme];

    return {
        colors,
        colorScheme,
        isDark: colorScheme === 'dark',
        isLight: colorScheme === 'light',
    };
}

// Type helper for color names
export type ColorName = keyof typeof Colors.light;

// Helper to get a specific color
export function getColor(colorName: ColorName, scheme: 'light' | 'dark' = 'light'): string {
    return Colors[scheme][colorName];
}

// Helper to create themed styles
export function createThemedStyles<T extends Record<string, any>>(
    stylesFn: (colors: typeof Colors.light, isDark: boolean) => T
) {
    return (colorScheme: 'light' | 'dark') => {
        const colors = Colors[colorScheme];
        const isDark = colorScheme === 'dark';
        return stylesFn(colors, isDark);
    };
}
