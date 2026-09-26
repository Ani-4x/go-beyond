import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { scheduleOnRN } from 'react-native-worklets';
import { DIMENSIONS, EDGE_GAP } from '../data/content';
import { spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const R = 100;

function pointAt(i: number, r: number) {
  'worklet';
  const a = ((i * 60 - 90) * Math.PI) / 180;
  return { x: Math.cos(a) * r * R, y: Math.sin(a) * r * R };
}

function polyPath(vals: number[]) {
  'worklet';
  let d = '';
  for (let i = 0; i < vals.length; i++) {
    const p = pointAt(i, vals[i]);
    d += (i === 0 ? 'M' : 'L') + p.x.toFixed(2) + ' ' + p.y.toFixed(2) + ' ';
  }
  return d + 'Z';
}

/** Current shape: `from` blended toward `to`. `p` can overshoot 1, which makes the zone stretch. */
function blend(from: number[], to: number[], p: number) {
  'worklet';
  return to.map((v, i) => Math.max(0, from[i] + (v - from[i]) * p));
}

type SV = SharedValue<number[]>;

function Dot({ i, from, to, p, color, r }: { i: number; from: SV; to: SV; p: SharedValue<number>; color: string; r: number }) {
  const props = useAnimatedProps(() => {
    const pt = pointAt(i, blend(from.value, to.value, p.value)[i]);
    return { cx: pt.x, cy: pt.y };
  });
  return <AnimatedCircle animatedProps={props} r={r} fill={color} />;
}

/** The ember marker on the edge of the dimension you are pushing today. */
function FocusMarker({ i, from, to, p, halo, small, color }: { i: number; from: SV; to: SV; p: SharedValue<number>; halo: SharedValue<number>; small: boolean; color: string }) {
  const base = small ? 13 : 12;
  const haloProps = useAnimatedProps(() => {
    const pt = pointAt(i, Math.min(1, blend(from.value, to.value, p.value)[i] + EDGE_GAP));
    return { cx: pt.x, cy: pt.y, r: base * (1 + 0.8 * halo.value), fillOpacity: 0.28 * (1 - halo.value) };
  });
  const dotProps = useAnimatedProps(() => {
    const pt = pointAt(i, Math.min(1, blend(from.value, to.value, p.value)[i] + EDGE_GAP));
    return { cx: pt.x, cy: pt.y };
  });
  return (
    <>
      <AnimatedCircle animatedProps={haloProps} fill={color} />
      <AnimatedCircle animatedProps={dotProps} r={small ? 6.5 : 6} fill={color} />
    </>
  );
}

type Props = {
  from: number[];
  to: number[];
  /** Dimension index to mark with the ember dot. */
  focus?: number;
  /** Rendered width in points. Height follows. */
  width: number;
  /** Axis labels around the chart. Off for the small thumbnail. */
  labels?: boolean;
  /** Milliseconds to wait before the zone starts moving. */
  delay?: number;
  onSettled?: () => void;
};

const VIEW_LABELED = { x: -172, y: -140, w: 344, h: 290 };
const VIEW_SMALL = { x: -115, y: -115, w: 230, h: 230 };

/** Pixel position of a point on the chart, so other things (like confetti) can start from it. */
export function radarPoint(index: number, value: number, width: number, labels = true) {
  const vb = labels ? VIEW_LABELED : VIEW_SMALL;
  const pt = pointAt(index, value);
  return { x: ((pt.x - vb.x) / vb.w) * width, y: ((pt.y - vb.y) / vb.w) * width };
}

/**
 * The signature visual: the filled shape is where you are comfortable, the dashed shape is your edge.
 * The zone springs from `from` to `to`, overshooting slightly before it settles.
 */
export function RadarChart({ from, to, focus, width, labels = true, delay = 0, onSettled }: Props) {
  const t = useTheme();
  const vb = labels ? VIEW_LABELED : VIEW_SMALL;
  const height = (width * vb.h) / vb.w;

  const fromSV = useSharedValue<number[]>(from);
  const toSV = useSharedValue<number[]>(to);
  const p = useSharedValue(0);
  const halo = useSharedValue(0);

  const signature = `${from.join(',')}|${to.join(',')}`;
  useEffect(() => {
    fromSV.value = from;
    toSV.value = to;
    p.value = 0;
    p.value = withDelay(
      delay,
      withSpring(1, spring.stretch, (finished) => {
        if (finished && onSettled) scheduleOnRN(onSettled);
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    halo.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [halo]);

  const zoneProps = useAnimatedProps(() => ({ d: polyPath(blend(fromSV.value, toSV.value, p.value)) }));
  const zoneGlowProps = useAnimatedProps(() => ({ d: polyPath(blend(fromSV.value, toSV.value, p.value)) }));
  const edgeProps = useAnimatedProps(() => ({
    d: polyPath(blend(fromSV.value, toSV.value, p.value).map((v) => Math.min(1, v + EDGE_GAP))),
  }));

  const ring = (r: number) =>
    Array.from({ length: 6 }, (_, i) => {
      const pt = pointAt(i, r);
      return `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`;
    }).join(' ');

  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Your zone: ${DIMENSIONS.map((d, i) => `${d} ${Math.round(to[i] * 100)} percent`).join(', ')}`}
    >
      <Svg width={width} height={height} viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}>
        {[0.25, 0.5, 0.75, 1].map((r) => (
          <Polygon key={r} points={ring(r)} fill="none" stroke={t.line} strokeWidth={1} strokeOpacity={0.7} />
        ))}
        {Array.from({ length: 6 }, (_, i) => {
          const pt = pointAt(i, 1);
          return <Line key={i} x1={0} y1={0} x2={pt.x} y2={pt.y} stroke={t.line} strokeWidth={1} strokeOpacity={0.55} />;
        })}

        <AnimatedPath
          d={polyPath(from.map((v) => Math.min(1, v + EDGE_GAP)))}
          animatedProps={edgeProps}
          fill="none"
          stroke={t.muted}
          strokeWidth={1.5}
          strokeDasharray={[3, 5]}
          strokeLinejoin="round"
        />
        {/* A soft, wider stroke underneath gives the zone shape a gentle glow at its edge. */}
        <AnimatedPath
          d={polyPath(from)}
          animatedProps={zoneGlowProps}
          fill="none"
          stroke={t.accent}
          strokeOpacity={0.22}
          strokeWidth={labels ? 9 : 6}
          strokeLinejoin="round"
        />
        <AnimatedPath
          d={polyPath(from)}
          animatedProps={zoneProps}
          fill={t.accent}
          fillOpacity={0.22}
          stroke={t.accent}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Dot key={i} i={i} from={fromSV} to={toSV} p={p} color={t.accent} r={labels ? 3.5 : 2.5} />
        ))}
        {focus !== undefined && (
          <FocusMarker i={focus} from={fromSV} to={toSV} p={p} halo={halo} small={!labels} color={t.ember} />
        )}

        {labels &&
          DIMENSIONS.map((label, i) => {
            const pt = pointAt(i, 1.22);
            const cos = Math.cos(((i * 60 - 90) * Math.PI) / 180);
            const sin = Math.sin(((i * 60 - 90) * Math.PI) / 180);
            const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
            const dy = sin < -0.5 ? -4 : sin > 0.5 ? 12 : 4;
            return (
              <SvgText
                key={label}
                x={pt.x}
                y={pt.y + dy}
                textAnchor={anchor}
                fontSize={12}
                fontFamily={i === focus ? fonts.semibold : fonts.medium}
                fill={i === focus ? t.ink : t.muted}
              >
                {label}
              </SvgText>
            );
          })}
      </Svg>
    </View>
  );
}
