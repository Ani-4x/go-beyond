import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Legend } from '../components/Legend';
import { RadarChart } from '../components/RadarChart';
import { StaggerIn } from '../components/StaggerIn';
import { DIMENSIONS, EDGE_GAP } from '../data/content';
import { useReplayKey, useSeen } from '../lib/hooks';
import type { TabParamList } from '../navigation/types';
import { useStore } from '../state/store';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

/** Remembered between visits so the chart can animate from where it was last time. */
let lastZone: number[] | null = null;

function DimRow({ index, label, value, fromValue }: { index: number; label: string; value: number; fromValue: number }) {
  const t = useTheme();
  const w = useSharedValue(fromValue);
  useEffect(() => {
    w.value = withDelay(600 + index * 70, withTiming(value, { duration: 900, easing: ease }));
  }, [value, index, w]);
  const zone = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, w.value)) * 100}%` }));
  const edge = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, w.value) + EDGE_GAP) * 100}%` }));
  const pct = Math.round(value * 100);

  return (
    <Animated.View entering={FadeInDown.delay(500 + index * 70).duration(500).easing(ease)} style={[styles.dim, { borderTopColor: t.line }]}>
      <View style={styles.dimHead}>
        <AppText variant="medium">{label}</AppText>
        <AppText variant="small" muted>{pct}% comfortable, edge at {Math.min(100, pct + Math.round(EDGE_GAP * 100))}%</AppText>
      </View>
      <View style={[styles.track, { backgroundColor: t.line }]}>
        <Animated.View style={[styles.bar, { backgroundColor: t.ember, opacity: 0.35 }, edge]} />
        <Animated.View style={[styles.bar, { backgroundColor: t.accent }, zone]} />
      </View>
    </Animated.View>
  );
}

function ZoneContent() {
  const t = useTheme();
  const { state } = useStore();
  const { width } = useWindowDimensions();

  const [from] = useState(() => {
    const f = lastZone ?? state.zone.map((v) => v * 0.5);
    lastZone = state.zone;
    return f;
  });

  const level = Math.floor(state.xp / 100) + 1;
  const into = (state.xp % 100) / 100;
  const prevXp = useSeen('xp', state.xp);
  const fromXp = prevXp !== undefined && Math.floor(prevXp / 100) === Math.floor(state.xp / 100) ? (prevXp % 100) / 100 : 0;
  const xp = useSharedValue(fromXp);
  useEffect(() => {
    xp.value = withDelay(500, withTiming(into, { duration: 1100, easing: ease }));
  }, [into, xp]);
  const xpStyle = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, xp.value)) * 100}%` }));

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <StaggerIn index={0}>
        <AppText variant="display">Your zone</AppText>
      </StaggerIn>
      <StaggerIn index={1} style={{ marginTop: 8 }}>
        <RadarChart from={from} to={state.zone} focus={state.today?.dim} width={width - 44} delay={150} />
        <Legend
          items={[
            { label: 'Comfortable', kind: 'zone' },
            { label: 'Edge', kind: 'edge' },
            { label: "Today's push", kind: 'focus' },
          ]}
        />
      </StaggerIn>

      <StaggerIn index={2} style={styles.xpRow}>
        <AppText variant="title" style={{ fontSize: 20 }}>Level {level}</AppText>
        <View style={[styles.xpTrack, { backgroundColor: t.line }]}>
          <Animated.View style={[styles.xpFill, { backgroundColor: t.accent }, xpStyle]} />
        </View>
        <AppText variant="caption" muted>{state.xp % 100} / 100 XP</AppText>
      </StaggerIn>

      {DIMENSIONS.map((label, i) => (
        <DimRow key={label} index={i} label={label} value={state.zone[i]} fromValue={from[i]} />
      ))}
    </ScrollView>
  );
}

/** Progress you can read at a glance. */
export function ZoneScreen(_props: BottomTabScreenProps<TabParamList, 'Zone'>) {
  const t = useTheme();
  const replay = useReplayKey();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ZoneContent key={replay} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 32 },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14, marginBottom: 22 },
  xpTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4 },
  dim: { paddingVertical: 12, borderTopWidth: 1.5 },
  dimHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
});
