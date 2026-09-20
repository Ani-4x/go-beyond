import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, PressableProps, StyleProp, ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { spring } from '../theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style' | 'children'> & {
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  scaleTo?: number;
  /** Light selection haptic on press. */
  haptic?: boolean;
};

/** Squishes on press and springs back. Every tappable thing in the app uses this. */
export function PressableScale({ style, children, scaleTo = 0.96, haptic, onPressIn, onPressOut, onPress, ...rest }: Props) {
  const s = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <AnimatedPressable
      {...rest}
      onPressIn={(e) => {
        s.value = withSpring(scaleTo, spring.snappy);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        s.value = withSpring(1, spring.bouncy);
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      style={[style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}
