import { Colors } from '@/constants/theme';

export type IntroScheme = 'light' | 'dark';

/** Full-screen base + layered glow colors for launch / intro surfaces */
export function getIntroPalette(scheme: IntroScheme) {
  const c = Colors[scheme];
  if (scheme === 'dark') {
    return {
      baseTop: '#0f0a14',
      baseBottom: c.background,
      glowA: 'rgba(233, 30, 140, 0.35)',
      glowB: 'rgba(147, 51, 234, 0.22)',
      glowC: 'rgba(217, 70, 166, 0.12)',
      textPrimary: c.foreground,
      textMuted: c.mutedForeground,
      logoDisc: 'rgba(255,255,255,0.08)',
      logoBorder: 'rgba(255,255,255,0.12)',
    };
  }
  return {
    baseTop: '#FFF8FA',
    baseBottom: c.background,
    glowA: 'rgba(233, 30, 140, 0.18)',
    glowB: 'rgba(192, 38, 211, 0.12)',
    glowC: 'rgba(250, 200, 220, 0.45)',
    textPrimary: c.foreground,
    textMuted: c.mutedForeground,
    logoDisc: '#ffffff',
    logoBorder: 'rgba(233, 30, 140, 0.12)',
  };
}
