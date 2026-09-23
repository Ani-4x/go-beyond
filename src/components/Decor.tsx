import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

type BloomProps = { size?: number; color: string; opacity?: number; style?: StyleProp<ViewStyle> };

/** A soft, out-of-focus glow. Purely atmospheric — sits behind content, never intercepts touches. */
export function Bloom({ size = 260, color, opacity = 0.5, style }: BloomProps) {
  const id = `bloom-${color.replace('#', '')}-${size}`;
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity={opacity} />
            <Stop offset="60%" stopColor={color} stopOpacity={opacity * 0.35} />
            <Stop offset="100%" stopColor={color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

type GradientFillProps = { colors: [string, string]; style?: StyleProp<ViewStyle> };

/** Diagonal two-tone gradient, absolutely filling its parent. Put it first, behind other children. */
export function GradientFill({ colors, style }: GradientFillProps) {
  const id = `gf-${colors[0].replace('#', '')}-${colors[1].replace('#', '')}`;
  return (
    <Svg pointerEvents="none" style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, style]}>
      <Defs>
        <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={colors[0]} stopOpacity={1} />
          <Stop offset="100%" stopColor={colors[1]} stopOpacity={1} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
    </Svg>
  );
}

/**
 * A bigger, standalone cousin of the "rings" tab icon: the filled zone, the dashed edge
 * beyond it, and the ember dot marking where you're headed. Used where the app wants to
 * plant its central idea before there's any real data to chart yet (e.g. Auth).
 */
export function ZoneGlyph({ size = 132, accent, ember, muted }: { size?: number; accent: string; ember: string; muted: string }) {
  const c = size / 2;
  const rZone = size * 0.22;
  const rEdge = size * 0.38;
  const dotAngle = -Math.PI / 4;
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <Circle cx={c} cy={c} r={rEdge} stroke={muted} strokeWidth={1.5} strokeDasharray={[3, 7]} fill="none" opacity={0.7} />
      <Circle cx={c} cy={c} r={rZone} stroke={accent} strokeWidth={2.4} fill={accent} fillOpacity={0.16} />
      <Circle cx={c + rEdge * Math.cos(dotAngle)} cy={c + rEdge * Math.sin(dotAngle)} r={5.5} fill={ember} />
      <Circle cx={c + rEdge * Math.cos(dotAngle)} cy={c + rEdge * Math.sin(dotAngle)} r={10} stroke={ember} strokeWidth={1.4} fill="none" opacity={0.35} />
    </Svg>
  );
}

/** Open notebook, line-art. Used for the journal's empty state instead of bare text. */
export function EmptyJournalArt({ size = 120, color, accent }: { size?: number; color: string; accent: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" fill="none">
      <Path
        d="M12 30C21.5 25.5 32 25.5 40 30V90C32 85.5 21.5 85.5 12 90V30Z"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path
        d="M108 30C98.5 25.5 88 25.5 80 30V90C88 85.5 98.5 85.5 108 90V30Z"
        stroke={color}
        strokeWidth={2.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <Path d="M40 30C50 25 70 25 80 30V90C70 85 50 85 40 90V30Z" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" opacity={0.55} />
      <Path d="M19 44H33M19 55H33M19 66H29" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <Path d="M87 44H101M87 55H101M87 66H97" stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.5} />
      <Circle cx={60} cy={20} r={3.5} fill={accent} />
      <Path d="M60 26V32" stroke={accent} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
