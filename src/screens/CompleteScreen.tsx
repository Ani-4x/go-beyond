import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Chip } from '../components/Chip';
import { Confetti } from '../components/Confetti';
import { GlowField } from '../components/GlowField';
import { RadarChart, radarPoint } from '../components/RadarChart';
import { WordReveal } from '../components/StaggerIn';
import { DIMENSIONS, EDGE_GAP, FEELINGS } from '../data/content';
import { useCountUp } from '../lib/hooks';
import type { RootStackParamList } from '../navigation/types';
import { previewCompletion, useStore } from '../state/store';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { brand, radius } from '../theme/tokens';

/** Reward: the edge visibly moves, then a single tap of reflection. */
export function CompleteScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Complete'>) {
  const t = useTheme();
  const { state, complete } = useStore();
  const { width } = useWindowDimensions();
  const [preview] = useState(() => previewCompletion(state)); // freeze before complete() changes state
  const [feel, setFeel] = useState<string | null>(null);
  const [burst, setBurst] = useState(0);

  const before = preview ? Math.round(preview.from[preview.dim] * 100) : 0;
  const after = preview ? Math.round(preview.to[preview.dim] * 100) : 0;
  const shownPct = useCountUp(after, { from: before, delay: 1200 });
  const shownXp = useCountUp(preview?.xpGain ?? 0, { from: 0, delay: 1200 });

  useEffect(() => {
    if (!preview) navigation.goBack();
  }, [preview, navigation]);
  if (!preview) return null;

  const chartWidth = width - 44;
  const origin = radarPoint(preview.dim, Math.min(1, preview.to[preview.dim] + EDGE_GAP), chartWidth);

  const save = () => {
    complete(feel ?? undefined);
    navigation.popTo('Main', { screen: 'Zone' });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <GlowField color={t.accent} size={460} opacity={0.34} style={[styles.ambientGlow, { left: width / 2 - 230 }]} />
        <WordReveal text="Your edge just moved." style={{ marginTop: 8 }} />

        <View style={{ marginTop: 8, width: chartWidth }}>
          <RadarChart
            from={preview.from}
            to={preview.to}
            focus={preview.dim}
            width={chartWidth}
            delay={500}
            onSettled={() => {
              setBurst((b) => b + 1);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            }}
          />
          <Confetti burstKey={burst} x={origin.x} y={origin.y} count={36} />
        </View>

        <View style={styles.statsWrap}>
          <Animated.View entering={FadeIn.delay(1050).duration(700)} style={styles.statsGlow} pointerEvents="none">
            <GlowField color={brand.ember} size={220} opacity={0.4} />
          </Animated.View>
          <View style={styles.stats}>
            <Animated.View entering={ZoomIn.delay(1150).springify()} style={[styles.stat, { backgroundColor: t.tint }]}>
              <AppText variant="label">{DIMENSIONS[preview.dim]} {shownPct}%</AppText>
            </Animated.View>
            <Animated.View entering={ZoomIn.delay(1300).springify()} style={[styles.stat, { backgroundColor: t.tint }]}>
              <AppText variant="label">+{shownXp} XP</AppText>
            </Animated.View>
          </View>
        </View>

        <Animated.View entering={FadeInDown.delay(1400).duration(500).easing(ease)}>
          <AppText variant="label" style={{ marginBottom: 10, fontSize: 16 }}>
            How did it feel? <AppText variant="body" muted>Optional</AppText>
          </AppText>
          <View style={styles.chips}>
            {FEELINGS.map((f) => (
              <Chip key={f} label={f} selected={feel === f} onPress={() => setFeel(feel === f ? null : f)} />
            ))}
          </View>
        </Animated.View>
      </ScrollView>

      <Animated.View entering={FadeInDown.delay(1500).duration(500).easing(ease)} style={styles.dock}>
        <Button label="Save to journal" onPress={save} />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 16 },
  ambientGlow: { position: 'absolute', top: -10 },
  statsWrap: { marginTop: 14, marginBottom: 24 },
  statsGlow: { position: 'absolute', left: -40, top: -90, alignItems: 'center', justifyContent: 'center' },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: radius.pill },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dock: { paddingHorizontal: 22, paddingBottom: 12, paddingTop: 8 },
});
