import React, { useEffect } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconName =
  | 'back'
  | 'close'
  | 'plus'
  | 'sunrise'
  | 'rings'
  | 'journal'
  | 'check'
  | 'flame'
  | 'account'
  | 'brain'
  | 'run'
  | 'people'
  | 'pin'
  | 'chart'
  | 'leaf'
  | 'search'
  | 'dots'
  | 'chevronRight'
  | 'gear'
  | 'trash'
  | 'edit';

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
      {name === 'account' && (
        <>
          <Circle cx="12" cy="8.5" r="3.3" {...stroke} />
          <Path d="M4.8 19.5c1.2-3.3 4-5 7.2-5s6 1.7 7.2 5" {...stroke} />
        </>
      )}
      {name === 'brain' && (
        <>
          <Circle cx="12" cy="12" r="7.2" {...stroke} />
          <Path d="M9 9.5c.8-1 2-1 2.4 0 .4 1-.4 1.4-.4 2.5 0 1.3 1.6 1.3 1.6 0 0-1.1-.6-1.5-.2-2.5.4-1 1.6-1 2.4 0" {...stroke} />
        </>
      )}
      {name === 'run' && (
        <>
          <Circle cx="14.5" cy="5.5" r="1.8" fill={color} />
          <Path d="M9 20l2.4-4.6-2-2 .8-3.6 3 2.4 3.2-1M8.4 13.4l-2.6 1.4M13 9.4L11.2 13l3 1.4 1 3.6" {...stroke} />
        </>
      )}
      {name === 'people' && (
        <>
          <Circle cx="9" cy="8.5" r="2.6" {...stroke} />
          <Circle cx="16" cy="9.5" r="2.1" {...stroke} />
          <Path d="M4 19c.6-3 2.4-4.6 5-4.6s4.4 1.6 5 4.6M14.3 14.7c2 .2 3.2 1.7 3.7 4.3" {...stroke} />
        </>
      )}
      {name === 'pin' && (
        <>
          <Path d="M12 21s6.5-6.1 6.5-11A6.5 6.5 0 0 0 5.5 10c0 4.9 6.5 11 6.5 11z" {...stroke} />
          <Circle cx="12" cy="10" r="1.8" fill={color} />
        </>
      )}
      {name === 'chart' && (
        <>
          <Path d="M4 20V13M10 20V7M16 20V10.5M20 20V4" {...stroke} />
        </>
      )}
      {name === 'leaf' && (
        <>
          <Path d="M6 18C4.5 12 8 6 18 5c1 10-5 13.5-11 13.5-1.4 0-2.6-.1-3.5-.3" {...stroke} />
          <Path d="M6.5 17.5 15 9" {...stroke} />
        </>
      )}
      {name === 'search' && (
        <>
          <Circle cx="10.5" cy="10.5" r="6" {...stroke} />
          <Path d="M15.2 15.2 20 20" {...stroke} />
        </>
      )}
      {name === 'dots' && (
        <>
          <Circle cx="6" cy="12" r="1.6" fill={color} />
          <Circle cx="12" cy="12" r="1.6" fill={color} />
          <Circle cx="18" cy="12" r="1.6" fill={color} />
        </>
      )}
      {name === 'chevronRight' && <Path d="M9 5l7 7-7 7" {...stroke} />}
      {name === 'gear' && (
        <>
          <Path d="M4 7h9M17 7h3M4 12h3M9 12h11M4 17h13M19 17h1" {...stroke} />
          <Circle cx="15" cy="7" r="2" fill={color} />
          <Circle cx="7" cy="12" r="2" fill={color} />
          <Circle cx="17" cy="17" r="2" fill={color} />
        </>
      )}
      {name === 'trash' && (
        <>
          <Path d="M5 7h14M9 7V5.5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5.5V7" {...stroke} />
          <Path d="M7 7l.7 12A2 2 0 0 0 9.7 21h4.6a2 2 0 0 0 2-1.8L17 7" {...stroke} />
          <Path d="M10.5 11v6M13.5 11v6" {...stroke} />
        </>
      )}
      {name === 'edit' && (
        <>
          <Path d="M4 20l.9-4 10.6-10.6 3.1 3.1L8 19l-4 1z" {...stroke} />
          <Path d="M13.6 7.3l3.1 3.1" {...stroke} />
        </>
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
