/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

/**
 * Strathspace Color Scheme - Matching the Web UI
 * Dark purple gradient backgrounds with pink/magenta accents
 */
export const Colors = {
  light: {
    // Core colors - Light mode (if needed)
    background: '#fafafa',           // Light background
    foreground: '#1a0d2e',           // Dark purple text
    card: '#ffffff',                 // White card background

    // Primary (Pink/Magenta accent)
    primary: '#e91e8c',              // Bright pink/magenta
    primaryForeground: '#ffffff',    // White text on pink

    // Secondary/Accent
    secondary: '#f5f5f5',            // Very light gray
    accent: '#d946a6',               // Slightly different pink shade
    secondaryForeground: '#1a0d2e',  // Dark purple text

    // Muted
    muted: '#e5e5e5',                // Light muted background
    mutedForeground: '#6b7280',      // Gray text

    // Destructive
    destructive: '#ef4444',          // Red for errors

    // Border/Input
    border: '#e5e5e5',               // Light border
    input: '#ffffff',                // White input background

    // Ring (focus indicator)
    ring: '#e91e8c',                 // Pink focus ring

    // Chart colors (keeping vibrant colors)
    chart1: '#e91e8c',               // Pink
    chart2: '#d946a6',               // Magenta
    chart3: '#c026d3',               // Purple
    chart4: '#9333ea',               // Violet
    chart5: '#7c3aed',               // Deep purple

    // Legacy compatibility
    text: '#1a0d2e',
    tint: '#e91e8c',
    icon: '#6b7280',
    tabIconDefault: '#6b7280',
    tabIconSelected: '#e91e8c',
  },
  dark: {
    // Core colors - Dark purple gradient from the web UI
    background: '#1a0d2e',           // Deep purple background (dark end of gradient)
    backgroundGradientStart: '#2d1b47', // Purple gradient start
    backgroundGradientEnd: '#1a0d2e',   // Purple gradient end
    foreground: '#ffffff',           // White text

    // Primary (Pink/Magenta accent from the web UI)
    primary: '#e91e8c',              // Bright pink/magenta (main accent color)
    primaryForeground: '#ffffff',    // White text on pink
    primaryHover: '#ff3da1',         // Lighter pink for hover states

    // Secondary/Accent
    secondary: '#3d2459',            // Dark purple (card background)
    accent: '#d946a6',               // Magenta accent
    secondaryForeground: '#ffffff',  // White text

    // Card/Surface colors
    card: '#3d2459',                 // Purple card background
    cardForeground: '#ffffff',       // White text on cards

    // Muted
    muted: '#2d1b47',                // Muted purple background
    mutedForeground: '#d1d5db',      // Light gray text

    // Destructive
    destructive: '#ef4444',          // Red for errors

    // Border/Input
    border: '#482961',               // Purple border (lighter than card)
    input: '#3d2459',                // Dark purple input background

    // Ring (focus indicator)
    ring: '#e91e8c',                 // Pink focus ring

    // Button variants
    buttonPrimary: '#e91e8c',        // Pink button
    buttonSecondary: '#3d2459',      // Purple button
    buttonOutline: 'transparent',    // Transparent button with border

    // Chart colors (vibrant for dark mode)
    chart1: '#e91e8c',               // Bright pink
    chart2: '#ff3da1',               // Light pink
    chart3: '#d946a6',               // Magenta
    chart4: '#c026d3',               // Purple
    chart5: '#9333ea',               // Violet

    // Legacy compatibility
    text: '#ffffff',
    tint: '#e91e8c',
    icon: '#d1d5db',
    tabIconDefault: '#9ca3af',
    tabIconSelected: '#e91e8c',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});

/**
 * Navigation themes customized to match our color tokens
 */
export const NavigationLightTheme = {
  dark: false,
  colors: {
    primary: Colors.light.primary,
    background: Colors.light.background,
    card: Colors.light.background,
    text: Colors.light.foreground,
    border: Colors.light.border,
    notification: Colors.light.primary,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700' as const,
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '900' as const,
    },
  },
};

export const NavigationDarkTheme = {
  dark: true,
  colors: {
    primary: Colors.dark.primary,
    background: Colors.dark.background,
    card: Colors.dark.background,
    text: Colors.dark.foreground,
    border: Colors.dark.border,
    notification: Colors.dark.primary,
  },
  fonts: {
    regular: {
      fontFamily: 'System',
      fontWeight: '400' as const,
    },
    medium: {
      fontFamily: 'System',
      fontWeight: '500' as const,
    },
    bold: {
      fontFamily: 'System',
      fontWeight: '700' as const,
    },
    heavy: {
      fontFamily: 'System',
      fontWeight: '900' as const,
    },
  },
};
