import React, { useEffect } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

function Ring({ index, size }: { index: number; size: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      index * 1800,
      withRepeat(withTiming(1, { duration: 5400, easing: Easing.out(Easing.quad) }), -1, false),
    );
  }, [index, p]);
  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 0.6 * (1 - p.value),
    transform: [{ scale: 0.35 + 1.35 * p.value }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 1.5,
          borderColor: 'rgba(255,255,255,0.55)',
        },
        style,
      ]}
    />
  );
}

/** Rings that expand and fade: the edge pushing outward. Sits behind content. */
export function Ripples({ size = 220, style }: { size?: number; style?: StyleProp<ViewStyle> }) {
  return (
    <View pointerEvents="none" style={[{ position: 'absolute', width: size, height: size }, style]}>
      {[0, 1, 2].map((i) => (
        <Ring key={i} index={i} size={size} />
      ))}
    </View>
  );
}
