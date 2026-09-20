import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

const COLORS = ['#FF5A36', '#2A3BFF', '#8E99FF', '#FFB199', '#5B6BFF'];

type Piece = { id: number; dx: number; dy: number; rot: number; w: number; h: number; color: string; round: boolean; dur: number };

function makePieces(count: number): Piece[] {
  return Array.from({ length: count }, (_, id) => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 150;
    const w = 6 + Math.random() * 6;
    return {
      id,
      dx: Math.cos(angle) * speed,
      dy: Math.sin(angle) * speed - 40,
      rot: (Math.random() - 0.5) * 720,
      w,
      h: w * (Math.random() < 0.5 ? 1 : 2.2),
      color: COLORS[id % COLORS.length],
      round: Math.random() < 0.4,
      dur: 1300 + Math.random() * 700,
    };
  });
}

function PieceView({ piece, x, y }: { piece: Piece; x: number; y: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: piece.dur, easing: Easing.linear });
  }, [piece.dur, t]);
  const style = useAnimatedStyle(() => {
    const e = 1 - (1 - t.value) * (1 - t.value); // ease-out for the burst
    return {
      opacity: t.value < 0.65 ? 1 : (1 - t.value) / 0.35,
      transform: [
        { translateX: piece.dx * e },
        { translateY: piece.dy * e + 300 * t.value * t.value }, // gravity
        { rotate: `${piece.rot * t.value}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x,
          top: y,
          width: piece.w,
          height: piece.h,
          borderRadius: piece.round ? piece.w / 2 : 2,
          backgroundColor: piece.color,
        },
        style,
      ]}
    />
  );
}

type Props = { burstKey: number; x: number; y: number; count?: number };

/** Change `burstKey` to fire a burst of confetti from (x, y). */
export function Confetti({ burstKey, x, y, count = 34 }: Props) {
  const pieces = useMemo(() => (burstKey > 0 ? makePieces(count) : []), [burstKey, count]);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p) => (
        <PieceView key={`${burstKey}-${p.id}`} piece={p} x={x} y={y} />
      ))}
    </View>
  );
}
