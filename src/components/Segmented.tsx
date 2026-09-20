import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

type Props<T extends string> = { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] };

/** Segmented control whose highlight slides between options. */
export function Segmented<T extends string>({ value, onChange, options }: Props<T>) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  const index = options.findIndex((o) => o.value === value);
  const segment = (width - 6) / options.length;

  useEffect(() => {
    x.value = withSpring(index * segment, spring.snappy);
  }, [index, segment, x]);

  const slider = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  return (
    <View
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.wrap, { backgroundColor: t.surface, borderColor: t.line }]}
      accessibilityRole="tablist"
    >
      {width > 0 && <Animated.View style={[styles.slider, { width: segment, backgroundColor: t.ink }, slider]} />}
      {options.map((o) => (
        <PressableScale
          key={o.value}
          haptic
          scaleTo={0.95}
          onPress={() => onChange(o.value)}
          style={styles.item}
          accessibilityRole="tab"
          accessibilityState={{ selected: o.value === value }}
        >
          <AppText variant="medium" color={o.value === value ? t.bg : t.muted} style={{ fontSize: 14 }}>
            {o.label}
          </AppText>
        </PressableScale>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: 14, borderWidth: 1.5, padding: 3 },
  slider: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 11 },
  item: { flex: 1, alignItems: 'center', paddingVertical: 8 },
});
