import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AccountSheet } from '../components/AccountSheet';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { GlowField } from '../components/GlowField';
import { Icon } from '../components/Icons';
import { Legend } from '../components/Legend';
import { PressableScale } from '../components/PressableScale';
import { RadarChart } from '../components/RadarChart';
import { StaggerIn } from '../components/StaggerIn';
import { DIMENSIONS, DIMENSION_STYLE, EDGE_GAP } from '../data/content';
import { useNavigation } from '@react-navigation/native';
import { useReplayKey } from '../lib/hooks';
import type { TabParamList, TabScreenNav } from '../navigation/types';
import { useMonetization } from '../state/monetization';
import { useStore, weakestDim } from '../state/store';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { gradients, radius, surfaceElevation } from '../theme/tokens';

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
        <Animated.View style={[styles.bar, styles.barGradient, zone]}>
          <LinearGradient colors={gradients.cobalt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function NextEdgeCard({ zone }: { zone: number[] }) {
  const t = useTheme();
  const dim = weakestDim(zone);
  const style = DIMENSION_STYLE[dim];
  return (
    <View style={[styles.nextEdge, surfaceElevation(t)]}>
      <View style={[styles.nextEdgeIcon, { backgroundColor: style.color + '26' }]}>
        <Icon name={style.icon} size={20} color={style.color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="small" muted>Your next edge</AppText>
        <AppText variant="label" style={{ fontSize: 17, marginTop: 1 }}>{DIMENSIONS[dim]}</AppText>
        <AppText variant="small" muted style={{ marginTop: 2 }}>Try something you've never done before.</AppText>
      </View>
      <Icon name="chevronRight" size={18} color={t.muted} />
    </View>
  );
}

function ZoneContent({ onOpenAccount, onOpenPaywall }: { onOpenAccount: () => void; onOpenPaywall: () => void }) {
  const t = useTheme();
  const { state } = useStore();
  const { isPro } = useMonetization();
  const { width } = useWindowDimensions();

  const [from] = useState(() => {
    const f = lastZone ?? state.zone.map((v) => v * 0.5);
    lastZone = state.zone;
    return f;
  });

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      {/* Sized and faded well past the visible area on every side, so nothing ever hard-clips it. */}
      <GlowField
        color={t.accent}
        size={480}
        opacity={0.38}
        style={[styles.ambientGlow, { left: width / 2 - 240 }]}
      />
      <StaggerIn index={0} style={styles.header}>
        <View>
          <AppText variant="display">Your zone</AppText>
          <AppText variant="small" muted style={{ marginTop: 4 }}>A balanced you, a braver tomorrow.</AppText>
        </View>
        <PressableScale
          onPress={onOpenAccount}
          scaleTo={0.9}
          accessibilityRole="button"
          accessibilityLabel="Account"
          style={[styles.accountBtn, surfaceElevation(t)]}
        >
          <Icon name="gear" size={18} color={t.ink} />
        </PressableScale>
      </StaggerIn>
      {isPro ? (
        <>
          <StaggerIn index={1} style={{ marginTop: 8 }}>
            <RadarChart from={from} to={state.zone} focus={weakestDim(state.zone)} width={width - 44} delay={150} />
            <Legend
              items={[
                { label: 'Comfortable', kind: 'zone' },
                { label: 'Edge', kind: 'edge' },
                { label: "Next up", kind: 'focus' },
              ]}
            />
          </StaggerIn>

          <StaggerIn index={2}>
            <NextEdgeCard zone={state.zone} />
          </StaggerIn>

          <StaggerIn index={3} style={{ marginTop: 4, marginBottom: 2 }}>
            <AppText variant="label" muted style={{ fontSize: 14 }}>Detailed progress</AppText>
          </StaggerIn>

          {DIMENSIONS.map((label, i) => (
            <DimRow key={label} index={i} label={label} value={state.zone[i]} fromValue={from[i]} />
          ))}
        </>
      ) : (
        <StaggerIn index={1} style={{ marginTop: 26 }}>
          <View style={[styles.lockedCard, surfaceElevation(t)]}>
            <View style={[styles.lockedIcon, { backgroundColor: t.tint }]}>
              <Icon name="chart" size={22} color={t.accent} />
            </View>
            <AppText variant="caption" color={t.accent} style={styles.proLabel}>GO BEYOND PRO</AppText>
            <AppText variant="title" style={{ marginTop: 8 }}>Your zone graph is a Pro insight</AppText>
            <AppText variant="small" muted style={{ marginTop: 8, lineHeight: 21 }}>
              Unlock your six-dimension growth graph, see your next edge, and follow detailed progress over time.
            </AppText>
            <Button label="Unlock Go Beyond Pro" onPress={onOpenPaywall} style={{ marginTop: 18 }} />
          </View>
        </StaggerIn>
      )}
    </ScrollView>
  );
}

/** Progress you can read at a glance. */
export function ZoneScreen(_props: BottomTabScreenProps<TabParamList, 'Zone'>) {
  const t = useTheme();
  const replay = useReplayKey();
  const navigation = useNavigation<TabScreenNav<'Zone'>>();
  const [account, setAccount] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ZoneContent key={replay} onOpenAccount={() => setAccount(true)} onOpenPaywall={() => navigation.navigate('Paywall')} />
      <AccountSheet visible={account} onClose={() => setAccount(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 150 },
  ambientGlow: { position: 'absolute', top: -30 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nextEdge: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg, marginTop: 16, marginBottom: 4 },
  nextEdgeIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  lockedCard: { padding: 20, borderRadius: radius.lg },
  lockedIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  proLabel: { letterSpacing: 1.4, fontSize: 11 },
  dim: { paddingVertical: 12, borderTopWidth: 1.5 },
  dimHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  bar: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 4 },
  barGradient: { overflow: 'hidden' },
});
