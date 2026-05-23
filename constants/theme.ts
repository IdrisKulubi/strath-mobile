/**
 * StrathSpace theme — synced with global.css and lib/design-tokens.ts
 */

import { Platform } from 'react-native';

import { Palette } from '@/lib/design-tokens';

export const Colors = {
  light: {
    ...Palette.light,
    text: Palette.light.foreground,
    tint: Palette.light.primary,
    icon: Palette.light.mutedForeground,
    chart1: Palette.light.primary,
    chart2: '#9E2F6A',
    chart3: '#7A2858',
    chart4: '#5E2248',
    chart5: '#421C38',
  },
  dark: {
    ...Palette.dark,
    backgroundGradientStart: Palette.dark.backgroundElevated,
    backgroundGradientEnd: Palette.dark.background,
    text: Palette.dark.foreground,
    tint: Palette.dark.primary,
    icon: Palette.dark.mutedForeground,
    buttonPrimary: Palette.dark.primary,
    buttonSecondary: Palette.dark.secondary,
    buttonOutline: 'transparent',
    chart1: Palette.dark.primary,
    chart2: Palette.dark.primaryHover,
    chart3: '#B83D7A',
    chart4: '#963066',
    chart5: '#742852',
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
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
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
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
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};
