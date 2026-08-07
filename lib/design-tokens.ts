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

/**
 * Direction B surface tokens for the always-dark Matchmaker Home.
 * These stay local to Home so the rest of the app can follow the selected theme.
 */
export const MATCHMAKER_HOME = {
  background: '#130D1D',
  backgroundRaised: '#1A1226',
  surface: '#21182E',
  surfacePressed: '#2B203A',
  surfaceStrong: '#342443',
  foreground: '#F8F4FB',
  mutedForeground: '#B6A9C2',
  subtleForeground: '#8E809C',
  border: '#443451',
  borderStrong: '#665071',
  primary: '#D94A8F',
  primaryPressed: '#BD3778',
  primaryForeground: '#FFF8FC',
  orbCyan: '#72D9E8',
  orbLavender: '#B48AE8',
  orbRose: '#F278B1',
  success: '#4FC38A',
  error: '#F07878',
  warning: '#E2AD57',
  scrim: 'rgba(19, 13, 29, 0.84)',
  navFill: 'rgba(30, 21, 43, 0.94)',
  navBorder: 'rgba(196, 169, 214, 0.20)',
  navActive: '#30233F',
  photoGradientMid: 'rgba(19, 13, 29, 0.35)',
  photoGradientBottom: 'rgba(19, 13, 29, 0.92)',
  photoTextMuted: 'rgba(248, 244, 251, 0.82)',
  gradientBaseTop: '#2A1430',
  gradientBaseMid: '#3A1840',
  gradientBaseBottom: '#160C1F',
  gradientGlowRose: 'rgba(242, 120, 177, 0.55)',
  gradientGlowMagenta: 'rgba(217, 74, 143, 0.48)',
  gradientGlowLavender: 'rgba(180, 138, 232, 0.38)',
  gradientGlowCyan: 'rgba(114, 217, 232, 0.18)',
  gradientVignette: 'rgba(13, 8, 20, 0.55)',
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
