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
  row: 16,
  sheet: 32,
  full: 9999,
  /** Alias for buttons, inputs, swipe track (see DESIGN.md) */
  pill: 9999,
} as const;

export const HEIGHTS = {
  primaryControl: 56,
  input: 48,
  optionRow: 56,
  touchMin: 44,
  tabBar: 62,
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
  photoTopScrim: 'rgba(19, 13, 29, 0.42)',
  glassSurface: 'rgba(24, 17, 34, 0.70)',
  glassBorder: 'rgba(226, 211, 238, 0.28)',
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
    background: '#F5F2F4',
    foreground: '#1A1418',
    card: '#FFFFFF',
    cardForeground: '#1A1418',
    sheet: '#FFFFFF',
    control: '#EDE9EC',
    controlBorder: '#D8D2D6',
    controlActive: '#E4DEE2',
    primary: '#C41258',
    primaryForeground: '#FFFBFD',
    primaryText: '#B8327A',
    secondary: '#EDEBF0',
    secondaryForeground: '#1A1418',
    muted: '#E8E6EC',
    mutedForeground: '#6B6368',
    accent: '#C41258',
    accentForeground: '#1A1418',
    destructive: '#C93B3B',
    border: '#D8D2D6',
    input: '#EDE9EC',
    ring: '#C41258',
    tabIconDefault: '#8A8494',
    tabIconSelected: '#C41258',
    success: '#2D9A62',
    warning: '#C47A1A',
    risingGlassTint: 'rgba(255, 255, 255, 0.42)',
    risingGlassOverlay: 'rgba(255, 255, 255, 0.68)',
    risingHeaderScrim0: 'rgba(245, 242, 244, 0.94)',
    risingHeaderScrim1: 'rgba(245, 242, 244, 0.62)',
    risingHeaderScrim2: 'rgba(245, 242, 244, 0.28)',
  },
  dark: {
    background: '#0D0B0D',
    backgroundElevated: '#151215',
    foreground: '#F7F3F5',
    card: '#151215',
    cardForeground: '#F7F3F5',
    sheet: '#151215',
    control: '#1E1A1E',
    controlBorder: '#2E292E',
    controlActive: '#2A252A',
    primary: '#E0186A',
    primaryForeground: '#FFFBFD',
    primaryText: '#FF5C97',
    primaryHover: '#F03288',
    secondary: '#2A252A',
    secondaryForeground: '#F7F3F5',
    muted: '#2A252A',
    mutedForeground: '#A8A0A5',
    accent: '#E0186A',
    accentForeground: '#F7F3F5',
    destructive: '#E05A5A',
    border: '#2E292E',
    input: '#1E1A1E',
    ring: '#E0186A',
    tabIconDefault: '#8A8494',
    tabIconSelected: '#E0186A',
    success: '#3DB87A',
    warning: '#E0A040',
    risingGlassTint: 'rgba(30, 21, 43, 0.38)',
    risingGlassOverlay: 'rgba(30, 21, 43, 0.52)',
    risingHeaderScrim0: 'rgba(13, 11, 13, 0.92)',
    risingHeaderScrim1: 'rgba(13, 11, 13, 0.68)',
    risingHeaderScrim2: 'rgba(13, 11, 13, 0.32)',
  },
} as const;

export type ThemeColors = typeof Palette.light & Partial<typeof Palette.dark>;
