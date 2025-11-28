/**
 * Custom hook to access theme colors easily
 * 
 * Usage:
 * const { colors } = useTheme();
 * const backgroundColor = colors.background;
 */

import { Colors } from '@/constants/theme';
import { useThemeContext } from '@/context/theme-context';

export function useTheme() {
    const { theme, isDark, toggleTheme } = useThemeContext();
    const colors = Colors[theme];

    return {
        colors,
        colorScheme: theme,
        isDark,
        isLight: theme === 'light',
        toggleTheme,
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
