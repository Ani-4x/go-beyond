import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeProvider';
import { fonts } from '../theme/tokens';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';
import { usePop } from './usePop';

type Props = { label: string; selected: boolean; onPress: () => void };

/** Pill used for feelings. Tap again to deselect. */
export function Chip({ label, selected, onPress }: Props) {
  const t = useTheme();
  const pop = usePop(selected);
  return (
    <Animated.View style={pop}>
      <PressableScale
        haptic
        scaleTo={0.93}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[styles.chip, { backgroundColor: selected ? t.ink : t.surface, borderColor: selected ? t.ink : t.line }]}
      >
        <AppText variant="medium" color={selected ? t.bg : t.ink} style={{ fontFamily: fonts.medium, fontSize: 15 }}>
          {label}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 999, borderWidth: 1.5 },
});
