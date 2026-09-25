import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

type Props = {
  /** Brand hex this glow is tinted with. */
  color: string;
  size: number;
  /** Peak opacity at the center of the glow. */
  opacity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Many gradient stops sampled along a gentle ease-out curve, rather than a couple of straight
 * segments. A gradient built from only 2–3 stops fades at a noticeably different rate in each
 * segment, and the eye reads that change in slope as a faint ring — a "Mach band" — even though
 * every color in between is technically present. More, closer-together stops make the curve
 * itself smooth, so there's nothing for the eye to catch on.
 */
const STEPS = 12;
const falloff = (t: number) => Math.pow(1 - t, 2.4);

/**
 * A soft, borderless field of color that fades to nothing — the one piece of "ambient" decoration
 * in the app, reused behind the radar chart, in the corner of the day's challenge card, and behind
 * the completion celebration. Never used as generic background texture.
 */
export function GlowField({ color, size, opacity = 0.5, style }: Props) {
  const id = `glow-${color.replace('#', '')}`;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} pointerEvents="none" style={style}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {Array.from({ length: STEPS + 1 }, (_, i) => {
            const t = i / STEPS;
            return (
              <Stop
                key={t}
                offset={`${(t * 100).toFixed(2)}%`}
                stopColor={color}
                stopOpacity={i === STEPS ? 0 : opacity * falloff(t)}
              />
            );
          })}
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}
