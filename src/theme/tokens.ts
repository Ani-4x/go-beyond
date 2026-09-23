import type { ViewStyle } from 'react-native';

export const brand = {
  cobalt: '#2A3BFF',
  ember: '#FF5A36',
  onEmber: '#1A0A05',
} as const;

/**
 * The app's two gradient identities. Used sparingly and specifically: cobalt marks effort
 * (today's challenge, the focus screen), ember marks payoff (the completion moment). Nothing
 * else in the app gets a gradient — that restraint is what keeps these two feel special.
 */
export const gradients = {
  cobalt: ['#3A3DFF', '#6A46FF'] as const,
  ember: ['#FF5A36', '#FF8A5C'] as const,
} as const;

export type Theme = {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  tint: string;
  /** Cobalt for strokes and icons on surfaces (lighter in dark mode for contrast). */
  accent: string;
  backdrop: string;
  cobalt: string;
  ember: string;
  onEmber: string;
};

export const themes: Record<'light' | 'dark', Theme> = {
  light: {
    scheme: 'light',
    bg: '#F1F3F8',
    surface: '#FFFFFF',
    ink: '#0E1226',
    muted: '#5B627D',
    line: '#DCE0EC',
    tint: '#E3E7FF',
    accent: '#2A3BFF',
    backdrop: 'rgba(6,8,15,0.55)',
    ...brand,
  },
  dark: {
    scheme: 'dark',
    bg: '#0D1020',
    surface: '#161A2F',
    ink: '#F0F2FA',
    muted: '#98A0BF',
    line: '#262B48',
    tint: '#1D2352',
    accent: '#8E99FF',
    backdrop: 'rgba(0,0,0,0.6)',
    ...brand,
  },
};

export const radius = { sm: 14, md: 18, lg: 22, xl: 30, xxl: 34, pill: 999 } as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  body: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
} as const;

/**
 * Cards float instead of being outlined. In light mode that's a soft, neutral shadow; a
 * dark-on-dark shadow has no contrast to show, so dark mode gets a barely-there glass
 * highlight border instead. Either way, this replaces the flat `borderWidth: 1.5` card
 * chrome that makes every surface look like the same SaaS-kit box.
 */
export function surfaceElevation(t: Theme): ViewStyle {
  if (t.scheme === 'dark') {
    return { backgroundColor: t.surface, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' };
  }
  return {
    backgroundColor: t.surface,
    shadowColor: '#141935',
    shadowOpacity: 0.09,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 3,
  };
}

/**
 * A soft, color-tinted lift for the app's two hero surfaces (primary buttons, the day's
 * challenge card). Tints the shadow itself rather than using a generic grey, which is what
 * makes these read as glowing rather than merely "raised". Android pre-9 ignores shadowColor
 * on elevation and falls back to a plain grey shadow — a graceful, minor degradation.
 */
export function glowElevation(hex: string, opacity = 0.4): ViewStyle {
  return {
    shadowColor: hex,
    shadowOpacity: opacity,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  };
}
