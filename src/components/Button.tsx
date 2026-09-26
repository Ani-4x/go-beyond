import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, gradients, radius } from '../theme/tokens';
import { PressableScale } from './PressableScale';
import { usePop } from './usePop';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'light' | 'ghost';
  /** Text color for the ghost variant (defaults to ink). */
  color?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Primary = ember, for the one thing to do — a gradient fades in and the button lifts with a
 * warm, tinted glow once it's ready to tap. Light = white, for use on cobalt surfaces, with a
 * quieter neutral lift. Ghost stays flat; it's for the second choice, never the main one.
 */
export function Button({ label, onPress, disabled, variant = 'primary', color, style }: Props) {
  const t = useTheme();
  const enabled = useSharedValue(disabled ? 0 : 1);
  useEffect(() => {
    enabled.value = withTiming(disabled ? 0 : 1, { duration: 260 });
  }, [disabled, enabled]);
  const pop = usePop(!disabled);

  const clear = 'rgba(0,0,0,0)';
  const bgFrom = variant === 'primary' ? t.line : variant === 'light' ? '#FFFFFF' : clear;
  const bgTo = variant === 'primary' ? t.ember : variant === 'light' ? '#FFFFFF' : clear;
  const txFrom = variant === 'primary' ? t.muted : variant === 'light' ? '#0E1226' : (color ?? t.ink);
  const txTo = variant === 'primary' ? t.onEmber : variant === 'light' ? '#0E1226' : (color ?? t.ink);

  const bg = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(enabled.value, [0, 1], [bgFrom, bgTo]) }));
  const tx = useAnimatedStyle(() => ({ color: interpolateColor(enabled.value, [0, 1], [txFrom, txTo]) }));
  const gradientFade = useAnimatedStyle(() => ({ opacity: enabled.value }));
  const glow = useAnimatedStyle(() => ({
    shadowOpacity: variant === 'primary' ? 0.4 * enabled.value : variant === 'light' ? 0.18 : 0,
  }));

  return (
    <Animated.View style={[pop, style]}>
      <Animated.View
        style={[
          variant === 'primary' && { shadowColor: t.ember, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: disabled ? 0 : 8 },
          variant === 'light' && { shadowColor: '#0B1330', shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
          glow,
        ]}
      >
        <PressableScale
          disabled={disabled}
          scaleTo={0.97}
          onPress={() => {
            if (variant !== 'ghost') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onPress?.();
          }}
          accessibilityRole="button"
          accessibilityState={{ disabled: !!disabled }}
        >
          <Animated.View style={[styles.base, variant === 'ghost' && styles.ghost, bg]}>
            {variant === 'primary' && (
              <Animated.View style={[StyleSheet.absoluteFill, gradientFade]}>
                <LinearGradient colors={gradients.ember} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1.1 }} style={StyleSheet.absoluteFill} />
              </Animated.View>
            )}
            <Animated.Text style={[styles.label, variant === 'ghost' && styles.ghostLabel, tx]}>{label}</Animated.Text>
          </Animated.View>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: { height: 54, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ghost: { height: 46 },
  label: { fontFamily: fonts.semibold, fontSize: 16 },
  ghostLabel: { fontFamily: fonts.medium },
});
