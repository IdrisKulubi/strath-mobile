/**
 * Canonical design tokens for StrathSpace mobile.
 * StyleSheet code should import from here or useTheme() — not inline hex.
 */

export const SPACING = {
  micro: 4,
  tight: 8,
  compact: 12,
  base: 16,
  comfortable: 20,
  section: 24,
  large: 32,
  xl: 40,
  screenX: 20,
  screenY: 16,
} as const;

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/** Typography roles — map to system font sizes/weights */
export const TYPOGRAPHY = {
  display: { fontSize: 28, lineHeight: 34, fontWeight: '700' as const },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '600' as const },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600' as const },
  body: { fontSize: 16, lineHeight: 22, fontWeight: '400' as const },
  callout: { fontSize: 15, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' as const },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '500' as const },
} as const;

export const MOTION = {
  micro: 150,
  short: 220,
  medium: 300,
  easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

/** Restrained palette — tinted neutrals + single accent (see DESIGN.md) */
export const Palette = {
  light: {
    background: '#F7F6F9',
    foreground: '#1C1524',
    card: '#FFFFFF',
    cardForeground: '#1C1524',
    primary: '#B8327A',
    primaryForeground: '#FFFBFD',
    secondary: '#EDEBF0',
    secondaryForeground: '#1C1524',
    muted: '#E8E6EC',
    mutedForeground: '#5C5668',
    accent: '#B8327A',
    accentForeground: '#1C1524',
    destructive: '#C93B3B',
    border: '#DDD9E4',
    input: '#FFFFFF',
    ring: '#B8327A',
    tabIconDefault: '#8A8494',
    tabIconSelected: '#B8327A',
    success: '#2D9A62',
    warning: '#C47A1A',
  },
  dark: {
    background: '#141118',
    backgroundElevated: '#1C1724',
    foreground: '#F5F3F8',
    card: '#221C2A',
    cardForeground: '#F5F3F8',
    primary: '#D94A8F',
    primaryForeground: '#FFFBFD',
    primaryHover: '#E866A3',
    secondary: '#2A2433',
    secondaryForeground: '#F5F3F8',
    muted: '#2A2433',
    mutedForeground: '#A39DAD',
    accent: '#D94A8F',
    accentForeground: '#F5F3F8',
    destructive: '#E05A5A',
    border: '#322A3D',
    input: '#221C2A',
    ring: '#D94A8F',
    tabIconDefault: '#8A8494',
    tabIconSelected: '#D94A8F',
    success: '#3DB87A',
    warning: '#E0A040',
  },
} as const;

export type ThemeColors = typeof Palette.light & Partial<typeof Palette.dark>;
