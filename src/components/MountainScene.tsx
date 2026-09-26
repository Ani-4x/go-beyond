import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

type Props = { style?: StyleProp<ViewStyle> };

/**
 * An original, illustrated dusk skyline — not a photo — for the swipeable challenge cards.
 * Purely decorative, so it's drawn to fill its container edge-to-edge regardless of aspect ratio.
 */
export function MountainScene({ style }: Props) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" style={style}>
      <Defs>
        <LinearGradient id="mtnSky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#382A66" />
          <Stop offset="42%" stopColor="#8A5C8E" />
          <Stop offset="72%" stopColor="#E8895F" />
          <Stop offset="100%" stopColor="#FFC97A" />
        </LinearGradient>
        <LinearGradient id="mtnFar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0%" stopColor="#4C3B78" />
          <Stop offset="100%" stopColor="#6E4F81" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="400" height="260" fill="url(#mtnSky)" />
      <Circle cx="292" cy="142" r="34" fill="#FFDCA6" opacity={0.85} />
      <Path d="M0 172 L58 120 L128 160 L198 104 L276 156 L338 108 L400 150 L400 260 L0 260 Z" fill="url(#mtnFar)" opacity={0.8} />
      <Path d="M0 214 L84 140 L152 188 L232 118 L302 182 L400 128 L400 260 L0 260 Z" fill="#251A3E" />
    </Svg>
  );
}
