import { useNavigation } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { GlowField } from '../components/GlowField';
import { DrawCheck, Icon } from '../components/Icons';
import { RadarChart } from '../components/RadarChart';
import { Ripples } from '../components/Ripples';
import { StaggerIn } from '../components/StaggerIn';
import { LEVEL_LABEL, Level, ZERO_ZONE } from '../data/content';
import { dayKey, longDate, weekDays } from '../lib/date';
import { useReplayKey, useSeen } from '../lib/hooks';
import type { TabParamList, TabScreenNav } from '../navigation/types';
import { useStore, useToday, weakestDim } from '../state/store';
import { ease, spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { brand, fonts, glowElevation, gradients, radius, surfaceElevation } from '../theme/tokens';

/* ---------------------------- pieces ---------------------------- */

function StreakChip({ streak }: { streak: number }) {
  const t = useTheme();
  const prev = useSeen('streak', streak);
  const grew = prev !== undefined && streak > prev;

  const flame = useSharedValue(0);
  const bump = useSharedValue(1);
  useEffect(() => {
    flame.value = withRepeat(
      withSequence(withTiming(-1, { duration: 780 }), withTiming(0.7, { duration: 780 }), withTiming(0, { duration: 1040 })),
      -1,
    );
    if (grew) bump.value = withDelay(500, withSequence(withSpring(1.22, spring.bouncy), withSpring(1, spring.bouncy)));
  }, [flame, bump, grew]);

  const flameStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${flame.value * 6}deg` }, { scale: 1 + Math.abs(flame.value) * 0.08 }],
  }));
  const chipStyle = useAnimatedStyle(() => ({ transform: [{ scale: bump.value }] }));

  return (
    <Animated.View style={[styles.streak, surfaceElevation(t), chipStyle]}>
      <Animated.View style={flameStyle}>
        <Icon name="flame" size={15} color={t.ember} />
      </Animated.View>
      <AppText variant="label">{streak}-day streak</AppText>
    </Animated.View>
  );
}

function Difficulty({ level }: { level: Level }) {
  return (
    <View style={styles.diff} accessibilityLabel={`Difficulty ${LEVEL_LABEL[level]}`}>
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {[1, 2, 3].map((n) =>
          n <= level ? (
            <Animated.View
              key={`${level}-${n}`}
              entering={ZoomIn.delay(n * 120).springify()}
              style={[styles.pip, { backgroundColor: '#fff' }]}
            />
          ) : (
            <View key={n} style={[styles.pip, { backgroundColor: 'rgba(255,255,255,0.35)' }]} />
          ),
        )}
      </View>
      <AppText variant="caption" color="#fff">{LEVEL_LABEL[level]}</AppText>
    </View>
  );
}

type DayState = 'done' | 'today' | 'missed' | 'future';

function DayDot({ label, state, fresh }: { label: string; state: DayState; fresh: boolean }) {
  const t = useTheme();
  const ring = useSharedValue(0);
  useEffect(() => {
    if (fresh) ring.value = withDelay(300, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
  }, [fresh, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.9 }] }));

  const base = { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' } as const;
  return (
    <View style={{ alignItems: 'center', gap: 6 }}>
      {state === 'done' && fresh ? (
        <Animated.View entering={ZoomIn.delay(300).springify()} style={[base, { backgroundColor: t.cobalt }]}>
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: 17, borderWidth: 2, borderColor: t.ember }, ringStyle]} />
          <DrawCheck size={15} color="#fff" strokeWidth={3} delay={500} />
        </Animated.View>
      ) : state === 'done' ? (
        <View style={[base, { backgroundColor: t.cobalt }]}>
          <Icon name="check" size={15} color="#fff" strokeWidth={2.8} />
        </View>
      ) : state === 'today' ? (
        <View style={[base, { borderWidth: 2, borderColor: t.ember }]} />
      ) : state === 'missed' ? (
        <View style={[base, { borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.line }]} />
      ) : (
        <View style={[base, { borderWidth: 1.5, borderColor: t.line, opacity: 0.55 }]} />
      )}
      <AppText variant="caption" muted>{label}</AppText>
    </View>
  );
}

/* ---------------------------- screen ---------------------------- */

function TodayContent() {
  const t = useTheme();
  const nav = useNavigation<TabScreenNav<'Today'>>();
  const { state, setShrunk } = useStore();
  const info = useToday();
  const wasDone = useSeen('todayDone', state.today?.done ? 1 : 0);

  if (!info) return <View style={{ flex: 1 }} />;
  const { today, level, baseLevel, challenge, dimLabel } = info;
  const canResize = baseLevel > 1 || today.shrunk;
  const pct = Math.round(state.zone[today.dim] * 100);
  const smallest = weakestDim(state.zone) === today.dim;
  const todayKey = dayKey();
  const justFinished = today.done && wasDone === 0;

  const meta =
    `About ${challenge.minutes} minutes. ` + (level === 1 ? 'Easy to start.' : level === 2 ? 'No prep needed.' : 'A real stretch.');

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <StaggerIn index={0} style={styles.headerRow}>
        <AppText variant="medium" muted>{longDate()}</AppText>
        <StreakChip streak={state.streak} />
      </StaggerIn>

      {!today.done ? (
        <StaggerIn index={1}>
          <View style={styles.heroShadow}>
            <View style={styles.hero}>
              <LinearGradient colors={gradients.cobalt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <GlowField color="#B7A9FF" size={240} opacity={0.5} style={styles.heroGlow} />
              <Ripples size={220} style={{ right: -70, top: -70 }} />
              <View style={styles.heroTop}>
                <View style={styles.pill}>
                  <AppText variant="label" color="#fff" style={{ fontSize: 13 }}>{dimLabel}</AppText>
                </View>
                <Difficulty level={level} />
              </View>
              <Animated.View key={challenge.text} entering={FadeInDown.duration(380).easing(ease)}>
                <AppText variant="hero" color="#fff">{challenge.text}</AppText>
                <AppText variant="small" color="rgba(255,255,255,0.85)" style={{ marginTop: 14, marginBottom: 22 }}>{meta}</AppText>
              </Animated.View>
              <Button label="Start challenge" onPress={() => nav.navigate('Focus')} />
              {canResize && (
                <Button
                  variant="ghost"
                  color="#fff"
                  label={today.shrunk ? 'Make it bigger' : 'Make it smaller'}
                  onPress={() => setShrunk(!today.shrunk)}
                />
              )}
            </View>
          </View>
        </StaggerIn>
      ) : (
        <StaggerIn index={1}>
          <View style={[styles.doneCard, { backgroundColor: t.tint }, t.scheme === 'dark' ? styles.doneCardDark : styles.doneCardLight]}>
            <Animated.View entering={ZoomIn.delay(150).springify()} style={[styles.tick, { backgroundColor: t.cobalt }]}>
              <DrawCheck size={22} color="#fff" delay={450} />
            </Animated.View>
            <AppText variant="title" style={{ marginBottom: 8 }}>Today's challenge is done.</AppText>
            <AppText variant="small" muted style={{ marginBottom: 16 }}>
              Your next one unlocks tomorrow morning, chosen from your new edge.
            </AppText>
            <Button label="Add a moment" onPress={() => nav.navigate('Journal', { openCapture: true })} />
          </View>
        </StaggerIn>
      )}

      <StaggerIn index={2}>
        <View style={[styles.card, styles.why, surfaceElevation(t)]}>
          <RadarChart from={ZERO_ZONE} to={state.zone} focus={today.dim} width={84} labels={false} delay={350} />
          <AppText variant="small" muted style={{ flex: 1 }}>
            {today.done ? (
              <>
                <AppText variant="small" style={styles.strong}>{dimLabel} grew to {pct}%.</AppText> Tomorrow's challenge will come from your new edge.
              </>
            ) : (
              <>
                <AppText variant="small" style={styles.strong}>
                  {smallest ? `${dimLabel} is your smallest zone at ${pct}%.` : `${dimLabel} is still growing at ${pct}%.`}
                </AppText>{' '}
                This challenge nudges its edge outward.
              </>
            )}
          </AppText>
        </View>
      </StaggerIn>

      <StaggerIn index={3}>
        <View style={[styles.card, surfaceElevation(t)]}>
          <AppText variant="label" muted style={{ marginBottom: 12 }}>This week</AppText>
          <View style={styles.days}>
            {weekDays().map((d) => {
              const done = state.completedDays.includes(d.key);
              const s: DayState = done ? 'done' : d.key === todayKey ? 'today' : d.key < todayKey ? 'missed' : 'future';
              return <DayDot key={d.key} label={d.label} state={s} fresh={s === 'done' && d.key === todayKey && justFinished} />;
            })}
          </View>
        </View>
      </StaggerIn>
    </ScrollView>
  );
}

/** Act starts here: one challenge, nothing competing with it. */
export function TodayScreen(_props: BottomTabScreenProps<TabParamList, 'Today'>) {
  const t = useTheme();
  const replay = useReplayKey(); // remount on focus so the entrance replays
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <TodayContent key={replay} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 22, paddingBottom: 150, gap: 14 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },
  heroShadow: { borderRadius: radius.xl, ...glowElevation(brand.cobalt, 0.34) },
  hero: { borderRadius: radius.xl, padding: 22, paddingBottom: 14, overflow: 'hidden', backgroundColor: brand.cobalt },
  heroGlow: { position: 'absolute', right: -70, top: -90 },
  heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  diff: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pip: { width: 8, height: 8, borderRadius: 4 },
  doneCard: { borderRadius: radius.xl, padding: 24 },
  doneCardLight: { shadowColor: '#141935', shadowOpacity: 0.07, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  doneCardDark: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tick: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  card: { borderRadius: radius.lg, padding: 16 },
  why: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  strong: { fontFamily: fonts.semibold },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
});
