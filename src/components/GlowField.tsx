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

// More stops = a smoother curve. 3 stops is what caused the visible ring
// before; ~12 is enough to make the falloff read as continuous.
const STOP_COUNT = 12;

// How quickly the glow decays. Higher = tighter/more concentrated center,
// lower = softer/more spread out. 2.2 is a gentle, natural-looking falloff.
const FALLOFF = 2.2;

/**
 * A soft, borderless field of color that fades to nothing — the one piece of "ambient" decoration
 * in the app, reused in exactly three places: behind the radar chart, in the corner of the day's
 * challenge card, and behind the completion celebration. Never used as generic background texture.
 */
export function GlowField({ color, size, opacity = 0.5, style }: Props) {
  const id = `glow-${color.replace('#', '')}`;

  // The original version used only 3 stops (0%, 55%, 100%), with opacity
  // dropping steeply from 0%→55% then gently from 55%→100%. That's two
  // straight-line segments meeting at different slopes — a "kink" at 55%.
  // Human vision is very sensitive to exactly that kind of slope change
  // (a "Mach band"), so it reads as a visible ring even though the gradient
  // is technically continuous.
  //
  // Sampling many stops off one smooth curve (opacity * (1 - t)^FALLOFF)
  // removes the kink entirely — the slope changes gradually everywhere,
  // so there's nothing for the eye to lock onto as an edge.
  const stops = Array.from({ length: STOP_COUNT }, (_, i) => {
    const t = i / (STOP_COUNT - 1); // 0 → 1 across the radius
    const stopOpacity = opacity * Math.pow(1 - t, FALLOFF);
    return { offset: `${(t * 100).toFixed(2)}%`, stopOpacity };
  });

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} pointerEvents="none" style={style}>
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          {stops.map((s, i) => (
            <Stop key={i} offset={s.offset} stopColor={color} stopOpacity={s.stopOpacity} />
          ))}
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={size} fill={`url(#${id})`} />
    </Svg>
  );
}