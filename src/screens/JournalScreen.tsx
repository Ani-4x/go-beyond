import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Alert, LayoutChangeEvent, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeOut,
  LinearTransition,
  ZoomIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { CaptureSheet } from '../components/CaptureSheet';
import { Chip } from '../components/Chip';
import { Confetti } from '../components/Confetti';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { StaggerIn } from '../components/StaggerIn';
import { styleForEntry } from '../data/content';
import { dayLabel, formatTime } from '../lib/date';
import { useReplayKey } from '../lib/hooks';
import type { TabParamList } from '../navigation/types';
import { Entry, useStore } from '../state/store';
import { ease, spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { surfaceElevation, fonts } from '../theme/tokens';

type Filter = 'all' | 'challenge' | 'moment';

/** Entries the journal has already shown. New ones get a small highlight. */
let seenIds: Set<string> | null = null;

function EntryRow({ entry, order, fresh, onDelete }: { entry: Entry; order: number; fresh: boolean; onDelete: () => void }) {
  const t = useTheme();
  const style = styleForEntry(entry.type, entry.tag);
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
        <View style={[styles.mark, { backgroundColor: style.color + '24' }]}>
          <Icon name={style.icon} size={16} color={style.color} />
        </View>
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
      <PressableScale
        onPress={onDelete}
        scaleTo={0.85}
        accessibilityRole="button"
        accessibilityLabel="More options"
        style={styles.dots}
      >
        <Icon name="dots" size={16} color={t.muted} />
      </PressableScale>
    </Animated.View>
  );
}

function JournalContent({ query }: { query: string }) {
  const { state, deleteEntry } = useStore();
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
    const q = query.trim().toLowerCase();
    const out: { label: string; items: Entry[] }[] = [];
    state.entries
      .filter((e) => filter === 'all' || e.type === filter)
      .filter((e) => !q || e.title.toLowerCase().includes(q) || e.tag.toLowerCase().includes(q))
      .forEach((e) => {
        const label = dayLabel(e.ts);
        const g = out.find((x) => x.label === label);
        if (g) g.items.push(e);
        else out.push({ label, items: [e] });
      });
    return out;
  }, [state.entries, filter, query]);

  const confirmDelete = (entry: Entry) => {
    Alert.alert('Delete this entry?', entry.title, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(entry.id) },
    ]);
  };

  let order = 0;
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <StaggerIn index={1} style={{ marginTop: 16, flexDirection: 'row', gap: 8 }}>
        <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label="Challenges" selected={filter === 'challenge'} onPress={() => setFilter('challenge')} />
        <Chip label="Moments" selected={filter === 'moment'} onPress={() => setFilter('moment')} />
      </StaggerIn>

      {groups.length === 0 ? (
        <AppText muted style={{ marginTop: 26 }}>
          {query ? 'Nothing matches that search.' : 'Nothing here yet. Add a moment to start your journal.'}
        </AppText>
      ) : (
        groups.map((g) => (
          <Animated.View key={g.label} layout={LinearTransition.springify().damping(18)} style={{ marginTop: 22 }}>
            <AppText variant="label" muted>{g.label}</AppText>
            {g.items.map((e) => (
              <EntryRow key={e.id} entry={e} order={order++} fresh={fresh.has(e.id)} onDelete={() => confirmDelete(e)} />
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
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');

  // "Add a moment" on the Today card opens the sheet here.
  const openCapture = route.params?.openCapture;
  useEffect(() => {
    if (openCapture) {
      setSheet(true);
      navigation.setParams({ openCapture: undefined });
    }
  }, [openCapture, navigation]);

  const onLayout = (e: LayoutChangeEvent) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <View style={{ flex: 1 }} onLayout={onLayout}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            {searching ? (
              <Animated.View entering={FadeInDown.duration(220)}>
                <TextInput
                  autoFocus
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search your journal"
                  placeholderTextColor={t.muted}
                  style={[styles.searchInput, { color: t.ink }]}
                />
              </Animated.View>
            ) : (
              <>
                <AppText variant="display">Journal</AppText>
                <AppText variant="small" muted style={{ marginTop: 2 }}>Small moments. A bigger you.</AppText>
              </>
            )}
          </View>
          <PressableScale
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              if (searching) setQuery('');
              setSearching((s) => !s);
            }}
            scaleTo={0.9}
            accessibilityRole="button"
            accessibilityLabel={searching ? 'Close search' : 'Search'}
            style={[styles.searchBtn, surfaceElevation(t)]}
          >
            <Icon name={searching ? 'close' : 'search'} size={18} color={t.ink} />
          </PressableScale>
        </View>

        <JournalContent key={replay} query={query} />

        <Animated.View entering={ZoomIn.delay(500).springify()} style={styles.addWrap}>
          <Button label="Add moment" onPress={() => setSheet(true)} />
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 22, paddingTop: 30 },
  searchBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  searchInput: { fontFamily: fonts.semibold, fontSize: 26, paddingVertical: 4 },
  scroll: { paddingHorizontal: 22, paddingBottom: 150 },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1.5 },
  mark: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', gap: 12, marginTop: 3 },
  dots: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  addWrap: { position: 'absolute', left: 20, right: 20, bottom: 96 },
});
