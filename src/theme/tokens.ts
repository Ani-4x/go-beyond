export const brand = {
  cobalt: '#2A3BFF',
  ember: '#FF5A36',
  onEmber: '#1A0A05',
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

export const radius = { sm: 14, md: 18, lg: 22, xl: 30, pill: 999 } as const;

export const fonts = {
  display: 'BricolageGrotesque_700Bold',
  body: 'InstrumentSans_400Regular',
  medium: 'InstrumentSans_500Medium',
  semibold: 'InstrumentSans_600SemiBold',
} as const;
