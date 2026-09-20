import React from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { ease, stagger } from '../theme/motion';
import { AppText, Variant } from './AppText';

type StaggerProps = { index?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode; delay?: number };

/** Rises into place. Give siblings increasing `index` for a stagger. */
export function StaggerIn({ index = 0, style, children, delay }: StaggerProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay ?? stagger(index)).duration(560).easing(ease)} style={style}>
      {children}
    </Animated.View>
  );
}

type WordProps = { text: string; variant?: Variant; color?: string; delay?: number; style?: StyleProp<ViewStyle> };

/** Headline that reveals one word at a time. */
export function WordReveal({ text, variant = 'display', color, delay = 130, style }: WordProps) {
  const words = text.split(' ');
  return (
    <View accessible accessibilityRole="header" accessibilityLabel={text} style={[{ flexDirection: 'row', flexWrap: 'wrap' }, style]}>
      {words.map((w, i) => (
        <Animated.View key={`${w}-${i}`} entering={FadeInDown.delay(delay + i * 50).duration(600).easing(ease)} style={{ marginRight: 8 }}>
          <AppText variant={variant} color={color}>
            {w}
          </AppText>
        </Animated.View>
      ))}
    </View>
  );
}
