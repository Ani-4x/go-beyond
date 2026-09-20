import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

function Segment({ on, index }: { on: boolean; index: number }) {
  const t = useTheme();
  const p = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    p.value = withDelay(on ? 90 + index * 70 : 0, withTiming(on ? 1 : 0, { duration: 450, easing: ease }));
  }, [on, index, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={[styles.seg, { backgroundColor: t.line }]}>
      <Animated.View style={[styles.fill, { backgroundColor: t.accent }, fill]} />
    </View>
  );
}

/** Progress bar made of small segments that fill in one by one. */
export function SegmentedProgress({ total, done }: { total: number; done: number }) {
  return (
    <View style={styles.row} accessibilityLabel={`Question ${done} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <Segment key={i} on={i < done} index={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row', gap: 5 },
  seg: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 5, borderRadius: 3 },
});
