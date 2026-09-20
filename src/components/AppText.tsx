import React from 'react';
import { StyleSheet, Text, TextProps } from 'react-native';
import { fonts } from '../theme/tokens';
import { useTheme } from '../theme/ThemeProvider';

export type Variant = 'display' | 'hero' | 'title' | 'body' | 'medium' | 'label' | 'small' | 'caption';

export const textStyles = StyleSheet.create({
  display: { fontFamily: fonts.display, fontSize: 31, lineHeight: 34, letterSpacing: -0.8 },
  hero: { fontFamily: fonts.display, fontSize: 30, lineHeight: 33, letterSpacing: -0.75 },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 29, letterSpacing: -0.5 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  medium: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  label: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 20 },
  small: { fontFamily: fonts.body, fontSize: 14.5, lineHeight: 21 },
  caption: { fontFamily: fonts.medium, fontSize: 12.5, lineHeight: 17 },
});

type Props = TextProps & { variant?: Variant; muted?: boolean; color?: string };

export function AppText({ variant = 'body', muted, color, style, ...rest }: Props) {
  const t = useTheme();
  return <Text {...rest} style={[textStyles[variant], { color: color ?? (muted ? t.muted : t.ink) }, style]} />;
}
