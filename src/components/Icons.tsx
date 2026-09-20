import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName = 'back' | 'close' | 'plus' | 'sunrise' | 'rings' | 'journal' | 'check' | 'flame';

type Props = { name: IconName; size?: number; color: string; strokeWidth?: number };

export function Icon({ name, size = 20, color, strokeWidth = 2.2 }: Props) {
  const stroke = { stroke: color, strokeWidth, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none' } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'back' && <Path d="M15 5l-7 7 7 7" {...stroke} />}
      {name === 'close' && <Path d="M6 6l12 12M18 6L6 18" {...stroke} />}
      {name === 'plus' && <Path d="M12 5v14M5 12h14" {...stroke} />}
      {name === 'check' && <Path d="M5 12.5l4.5 4.5L19 7.5" {...stroke} />}
      {name === 'sunrise' && (
        <Path d="M3 18h18M7.5 18a4.5 4.5 0 0 1 9 0M12 6v2M5.6 9.6l1.4 1.4M18.4 9.6L17 11" {...stroke} />
      )}
      {name === 'rings' && (
        <>
          <Circle cx="12" cy="12" r="2.6" {...stroke} />
          <Circle cx="12" cy="12" r="8" strokeDasharray={[2.6, 3.2]} {...stroke} />
        </>
      )}
      {name === 'journal' && (
        <>
          <Rect x="5" y="4" width="14" height="16" rx="3" {...stroke} />
          <Path d="M9 9h6M9 13h4" {...stroke} />
        </>
      )}
      {name === 'flame' && (
        <Path
          d="M12 2c1 4 6 6 6 11.5a6 6 0 0 1-12 0c0-2.4 1.1-3.8 2.3-5 .3 1.7 1 2.4 2.1 2.6C10 8.6 10.4 5 12 2z"
          fill={color}
        />
      )}
    </Svg>
  );
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const CHECK_LENGTH = 20;

/** A check mark that draws itself. */
export function DrawCheck({ size = 20, color, delay = 400, strokeWidth = 2.6 }: { size?: number; color: string; delay?: number; strokeWidth?: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(1, { duration: 450, easing: Easing.out(Easing.cubic) }));
  }, [delay, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - p.value) }));
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <AnimatedPath
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={[CHECK_LENGTH, CHECK_LENGTH]}
        animatedProps={props}
      />
    </Svg>
  );
}
