import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useMemo, useState } from 'react';
import { LayoutChangeEvent, ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { CaptureSheet } from '../components/CaptureSheet';
import { Confetti } from '../components/Confetti';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { Segmented } from '../components/Segmented';
import { StaggerIn } from '../components/StaggerIn';
import { dayLabel, formatTime } from '../lib/date';
import { useReplayKey } from '../lib/hooks';
import type { TabParamList } from '../navigation/types';
import { Entry, useStore } from '../state/store';
import { ease, spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

type Filter = 'all' | 'challenge' | 'moment';

/** Entries the journal has already shown. New ones get a small highlight. */
let seenIds: Set<string> | null = null;

function EntryRow({ entry, order, fresh }: { entry: Entry; order: number; fresh: boolean }) {
  const t = useTheme();
  const ring = useSharedValue(0);
  useEffect(() => {
    if (fresh) ring.value = withDelay(250, withTiming(1, { duration: 1100, easing: Easing.out(Easing.quad) }));
  }, [fresh, ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - ring.value), transform: [{ scale: 1 + ring.value * 0.9 }] }));

  const meta = [entry.tag, entry.feel, formatTime(entry.ts)].filter(Boolean) as string[];
  return (
    <Animated.View
      entering={(fresh ? FadeInDown.springify() : FadeInDown.delay(80 + order * 45).duration(500).easing(ease))}
      exiting={FadeOut.duration(150)}
      layout={LinearTransition.springify().damping(18)}
      style={[styles.entry, { borderTopColor: t.line }]}
    >
      <View style={{ marginTop: 1 }}>
        {entry.type === 'challenge' ? (
          <View style={[styles.mark, { backgroundColor: t.cobalt }]}>
            <Icon name="check" size={13} color="#fff" strokeWidth={3} />
          </View>
        ) : (
          <View style={[styles.mark, { borderWidth: 2, borderColor: t.line }]} />
        )}
        {fresh && (
          <Animated.View pointerEvents="none" style={[styles.mark, StyleSheet.absoluteFill, { borderWidth: 2, borderColor: t.ember }, ringStyle]} />
        )}
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="medium" style={{ lineHeight: 21 }}>{entry.title}</AppText>
        <View style={styles.meta}>
          {meta.map((m, i) => (
            <AppText key={`${m}-${i}`} variant="small" muted={i > 0} style={{ fontSize: 13.5, opacity: i === 0 ? 0.85 : 1 }}>{m}</AppText>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

function JournalContent() {
  const { state } = useStore();
  const [filter, setFilter] = useState<Filter>('all');

  // Decide once per mount which entries are new since the last visit.
  const [fresh] = useState(() => {
    const ids = state.entries.map((e) => e.id);
    if (seenIds === null) {
      seenIds = new Set(ids);
      return new Set<string>();
    }
    const f = new Set(ids.filter((id) => !seenIds!.has(id)));
    ids.forEach((id) => seenIds!.add(id));
    return f;
  });

  const groups = useMemo(() => {
    const out: { label: string; items: Entry[] }[] = [];
    state.entries
      .filter((e) => filter === 'all' || e.type === filter)
      .forEach((e) => {
        const label = dayLabel(e.ts);
        const g = out.find((x) => x.label === label);
        if (g) g.items.push(e);
        else out.push({ label, items: [e] });
      });
    return out;
  }, [state.entries, filter]);

  let order = 0;
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <StaggerIn index={0}>
        <AppText variant="display">Journal</AppText>
      </StaggerIn>
      <StaggerIn index={1} style={{ marginTop: 16 }}>
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All' },
            { value: 'challenge', label: 'Challenges' },
            { value: 'moment', label: 'Moments' },
          ]}
        />
      </StaggerIn>

      {groups.length === 0 ? (
        <AppText muted style={{ marginTop: 26 }}>Nothing here yet. Add a moment to start your journal.</AppText>
      ) : (
        groups.map((g) => (
          <Animated.View key={g.label} layout={LinearTransition.springify().damping(18)} style={{ marginTop: 22 }}>
            <AppText variant="label" muted>{g.label}</AppText>
            {g.items.map((e) => (
              <EntryRow key={e.id} entry={e} order={order++} fresh={fresh.has(e.id)} />
            ))}
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

/** Everything you did, unscored. Moments never earn XP. */
export function JournalScreen({ route, navigation }: BottomTabScreenProps<TabParamList, 'Journal'>) {
  const t = useTheme();
  const { addMoment } = useStore();
  const replay = useReplayKey();
  const [sheet, setSheet] = useState(false);
  const [burst, setBurst] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // "Add a moment" on the Today card opens the sheet here.
  const openCapture = route.params?.openCapture;
  useEffect(() => {
    if (openCapture) {
      setSheet(true);
      navigation.setParams({ openCapture: undefined });
    }
  }, [openCapture, navigation]);

  const rot = useSharedValue(0);
  useEffect(() => {
    rot.value = withSpring(sheet ? 135 : 0, spring.bouncy);
  }, [sheet, rot]);
  const plus = useAnimatedStyle(() => ({ transform: [{ rotate: `${rot.value}deg` }] }));

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <JournalContent key={replay} />

        <Animated.View entering={ZoomIn.delay(500).springify()} style={styles.fabWrap}>
          <PressableScale
            haptic
            scaleTo={0.93}
            onPress={() => setSheet(true)}
            accessibilityRole="button"
            accessibilityLabel="Add moment"
            style={[styles.fab, { backgroundColor: t.ember }]}
          >
            <Animated.View style={plus}>
              <Icon name="plus" color={t.onEmber} />
            </Animated.View>
            <AppText variant="label" color={t.onEmber} style={{ fontSize: 15 }}>Add moment</AppText>
          </PressableScale>
        </Animated.View>

        <Confetti burstKey={burst} x={box.w / 2} y={box.h - 60} count={18} />
      </View>

      <CaptureSheet
        visible={sheet}
        onClose={() => setSheet(false)}
        onSave={(m) => {
          addMoment(m);
          setSheet(false);
          setBurst((b) => b + 1);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 110 },
  entry: { flexDirection: 'row', gap: 14, paddingVertical: 14, borderTopWidth: 1.5 },
  mark: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', gap: 12, marginTop: 3 },
  fabWrap: { position: 'absolute', right: 20, bottom: 18 },
  fab: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 52, paddingLeft: 16, paddingRight: 20, borderRadius: 26 },
});
