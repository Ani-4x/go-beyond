import type { ViewStyle } from 'react-native';

/**
 * Violet is the app's one accent hue — effort, growth, the zone shape, the active tab. Ember
 * is reserved for warmth: streaks, XP, the completion celebration. Nothing else gets a color.
 */
export const brand = {
  cobalt: '#6C5CE7',
  ember: '#FF8A3D',
  onEmber: '#1A0A05',
} as const;

/**
 * The app's two gradient identities. Used sparingly and specifically: violet marks effort
 * (today's challenge, the focus screen), ember marks payoff (the completion moment). Nothing
 * else in the app gets a gradient — that restraint is what keeps these two feel special.
 */
export const gradients = {
  cobalt: ['#8C7DFF', '#6C5CE7'] as const,
  ember: ['#FF8A3D', '#FFB073'] as const,
} as const;

export type Theme = {
  scheme: 'light' | 'dark';
  bg: string;
  surface: string;
  ink: string;
  muted: string;
  line: string;
  tint: string;
  /** Violet for strokes and icons on surfaces (lighter in dark mode for contrast). */
  accent: string;
  backdrop: string;
  cobalt: string;
  ember: string;
  onEmber: string;
};

export const themes: Record<'light' | 'dark', Theme> = {
  light: {
    scheme: 'light',
    bg: '#F4F2FC',
    surface: '#FFFFFF',
    ink: '#131230',
    muted: '#5F5D82',
    line: '#E3DEF8',
    tint: '#EDE9FF',
    accent: '#6C5CE7',
    backdrop: 'rgba(10,8,26,0.55)',
    ...brand,
  },
  dark: {
    scheme: 'dark',
    bg: '#100F28',
    surface: '#1A1A3C',
    ink: '#F1EFFB',
    muted: '#9F9CC4',
    line: '#2C2C57',
    tint: '#252650',
    accent: '#9186FF',
    backdrop: 'rgba(6,5,20,0.62)',
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
 * Cards sit on a soft violet-tinted hairline border, with a neutral shadow in light mode for
 * extra lift (a dark-on-dark shadow has no contrast to show, so dark mode relies on the border
 * alone). This is the one card style in the app — nothing uses a flat, colorless grey border.
 */
export function surfaceElevation(t: Theme): ViewStyle {
  if (t.scheme === 'dark') {
    return { backgroundColor: t.surface, borderWidth: 1, borderColor: 'rgba(145,134,255,0.22)' };
  }
  return {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: 'rgba(108,92,231,0.14)',
    shadowColor: '#241F4D',
    shadowOpacity: 0.07,
    shadowRadius: 20,
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
