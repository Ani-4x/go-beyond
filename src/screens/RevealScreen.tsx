import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { GlowField } from '../components/GlowField';
import { Legend } from '../components/Legend';
import { RadarChart } from '../components/RadarChart';
import { StaggerIn, WordReveal } from '../components/StaggerIn';
import { ZERO_ZONE } from '../data/content';
import type { RootStackParamList } from '../navigation/types';
import { useStore, weakestDim } from '../state/store';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

/** The baseline pays off with a shape, not a score. */
export function RevealScreen(_props: NativeStackScreenProps<RootStackParamList, 'Reveal'>) {
  const t = useTheme();
  const { state, completeOnboarding } = useStore();
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={styles.body}>
        <GlowField color={t.accent} size={460} opacity={0.36} style={[styles.ambientGlow, { left: width / 2 - 230 }]} />
        <WordReveal text="This is your starting zone." />
        <View style={{ marginTop: 14 }}>
          <RadarChart from={ZERO_ZONE} to={state.zone} focus={weakestDim(state.zone)} width={width - 44} delay={450} />
        </View>
        <StaggerIn delay={1300}>
          <Legend
            items={[
              { label: "Where you're comfortable", kind: 'zone' },
              { label: 'Your edge', kind: 'edge' },
            ]}
          />
        </StaggerIn>
        <StaggerIn delay={1450} style={{ marginTop: 16 }}>
          <AppText variant="small" muted>Your challenges will come from the edge, the place just past what feels easy.</AppText>
        </StaggerIn>
      </View>
      <Animated.View entering={FadeInDown.delay(1550).duration(500).easing(ease)} style={styles.dock}>
        <Button label="See my first challenge" onPress={completeOnboarding} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 34 },
  ambientGlow: { position: 'absolute', top: -10 },
  dock: { paddingHorizontal: 22, paddingBottom: 12, paddingTop: 8 },
});
