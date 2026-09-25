import { useNavigation } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
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
import { ScrollView } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { DrawCheck, Icon } from '../components/Icons';
import { MountainScene } from '../components/MountainScene';
import { PressableScale } from '../components/PressableScale';
import { StaggerIn } from '../components/StaggerIn';
import { DIMENSION_STYLE, QUOTES, XP as XP_TABLE } from '../data/content';
import { useReplayKey, useSeen } from '../lib/hooks';
import type { TabParamList, TabScreenNav } from '../navigation/types';
import { useAuth } from '../state/auth';
import { EnrichedItem, useStore, useTodayQuests } from '../state/store';
import { spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { brand, fonts, glowElevation, radius, surfaceElevation } from '../theme/tokens';

const SWIPE_THRESHOLD = 110;
const VELOCITY_THRESHOLD = 750;

/* ---------------------------- small pieces ---------------------------- */

function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'Good night' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

function displayName(name: string | null | undefined, email: string | undefined) {
  if (name) return name;
  if (!email) return '';
  const local = email.split('@')[0];
  return local.charAt(0).toUpperCase() + local.slice(1);
}

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

/* ---------------------------- swipe stack ---------------------------- */

/** The visual only — no interaction. Both the top (interactive) and next (peeking) card use this. */
function CandidateCard({ item, overlay }: { item: EnrichedItem; overlay?: React.ReactNode }) {
  const style = DIMENSION_STYLE[item.dim];
  const quote = QUOTES[(Math.floor(Date.now() / 86400000) + item.dim) % QUOTES.length];
  return (
    <View style={styles.hero}>
      <MountainScene style={StyleSheet.absoluteFill} />
      <LinearGradient
        colors={['rgba(16,15,40,0)', 'rgba(12,10,28,0.55)', 'rgba(10,8,24,0.92)']}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />
      <AppText variant="medium" color="rgba(255,255,255,0.82)" style={{ fontSize: 14 }}>
        A challenge for {item.dimLabel.toLowerCase()}
      </AppText>
      <AppText variant="hero" color="#fff" style={styles.heroTitle} numberOfLines={4}>
        {item.challenge.text}
      </AppText>
      <View style={styles.heroMeta}>
        <View style={[styles.metaPill, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <Icon name={style.icon} size={13} color="#fff" />
          <AppText variant="label" color="#fff" style={{ fontSize: 13 }}>{item.dimLabel}</AppText>
        </View>
        <View style={[styles.metaPill, { backgroundColor: 'rgba(255,255,255,0.16)' }]}>
          <AppText variant="label" color="#fff" style={{ fontSize: 13 }}>+{XP_TABLE[item.level]} XP</AppText>
        </View>
      </View>
      <AppText variant="small" color="rgba(255,255,255,0.85)" style={styles.quote} numberOfLines={2}>
        "{quote}"
      </AppText>
      {overlay}
    </View>
  );
}

/**
 * Swipe right to add a challenge to today's list, left to pass on it — no cap on how many you
 * can accept. Buttons underneath do the same thing for anyone who'd rather tap than drag.
 */
function SwipeStack({ pool, onSwipe }: { pool: EnrichedItem[]; onSwipe: (id: string, accept: boolean) => void }) {
  const t = useTheme();
  const { width } = useWindowDimensions();
  const top = pool[0];
  const next = pool[1];

  const dragX = useSharedValue(0);
  const dragY = useSharedValue(0);
  const gone = useSharedValue(false);

  useEffect(() => {
    dragX.value = 0;
    dragY.value = 0;
    gone.value = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top?.id]);

  const finish = (id: string, accept: boolean) => onSwipe(id, accept);

  const fly = (accept: boolean) => {
    if (!top || gone.value) return;
    gone.value = true;
    Haptics.impactAsync(accept ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const toX = (accept ? 1 : -1) * width * 1.4;
    dragX.value = withTiming(toX, { duration: 280, easing: Easing.out(Easing.cubic) }, (finished) => {
      if (finished) scheduleOnRN(finish, top.id, accept);
    });
    dragY.value = withTiming(dragY.value + 24, { duration: 280 });
  };

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      if (gone.value) return;
      dragX.value = e.translationX;
      dragY.value = e.translationY * 0.2;
    })
    .onEnd((e) => {
      if (gone.value || !top) return;
      const past = Math.abs(e.translationX) > SWIPE_THRESHOLD || Math.abs(e.velocityX) > VELOCITY_THRESHOLD;
      if (past) {
        gone.value = true;
        Haptics.impactAsync(e.translationX > 0 ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        const toX = (e.translationX > 0 ? 1 : -1) * width * 1.4;
        dragX.value = withTiming(toX, { duration: 240, easing: Easing.out(Easing.cubic) }, (finished) => {
          if (finished) scheduleOnRN(finish, top.id, e.translationX > 0);
        });
        dragY.value = withTiming(dragY.value, { duration: 240 });
      } else {
        dragX.value = withSpring(0, spring.gentle);
        dragY.value = withSpring(0, spring.gentle);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dragX.value }, { translateY: dragY.value }, { rotate: `${dragX.value / 18}deg` }],
  }));
  const acceptStamp = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, dragX.value / 90)) }));
  const declineStamp = useAnimatedStyle(() => ({ opacity: Math.max(0, Math.min(1, -dragX.value / 90)) }));
  const nextStyle = useAnimatedStyle(() => {
    const p = Math.min(1, Math.abs(dragX.value) / 200);
    return { transform: [{ scale: 0.93 + 0.07 * p }, { translateY: 12 - 12 * p }], opacity: 0.55 + 0.45 * p };
  });

  if (!top) {
    return (
      <View style={[styles.emptyStack, surfaceElevation(t)]}>
        <Icon name="check" size={18} color={t.muted} />
        <AppText variant="small" muted style={{ flex: 1 }}>
          You've reviewed every challenge type for today.
        </AppText>
      </View>
    );
  }

  return (
    <View>
      <View style={styles.stackArea}>
        {next && (
          <Animated.View style={[styles.cardAbs, styles.heroShadow, nextStyle]}>
            <CandidateCard item={next} />
          </Animated.View>
        )}
        <GestureDetector gesture={pan}>
          <Animated.View style={[styles.cardAbs, styles.heroShadow, cardStyle]}>
            <CandidateCard
              item={top}
              overlay={
                <>
                  <Animated.View style={[styles.stamp, styles.stampAccept, acceptStamp]}>
                    <AppText variant="label" color="#5FE3A6" style={styles.stampText}>ADD</AppText>
                  </Animated.View>
                  <Animated.View style={[styles.stamp, styles.stampDecline, declineStamp]}>
                    <AppText variant="label" color="#FF8C8C" style={styles.stampText}>SKIP</AppText>
                  </Animated.View>
                </>
              }
            />
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={styles.swipeButtons}>
        <PressableScale
          onPress={() => fly(false)}
          scaleTo={0.88}
          haptic
          accessibilityRole="button"
          accessibilityLabel="Skip this challenge"
          style={[styles.swipeBtn, surfaceElevation(t)]}
        >
          <Icon name="close" size={22} color={t.muted} />
        </PressableScale>
        <AppText variant="caption" muted>Swipe, or tap to choose</AppText>
        <PressableScale
          onPress={() => fly(true)}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Add this challenge"
          style={[styles.swipeBtn, styles.swipeBtnAccept, glowElevation(brand.cobalt, 0.35)]}
        >
          <Icon name="check" size={22} color="#fff" strokeWidth={3} />
        </PressableScale>
      </View>
    </View>
  );
}

function ChecklistRow({ item, index, onPress }: { item: EnrichedItem; index: number; onPress: () => void }) {
  const t = useTheme();
  const style = DIMENSION_STYLE[item.dim];
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).duration(450)}>
      <PressableScale
        onPress={item.done ? undefined : onPress}
        disabled={item.done}
        scaleTo={0.98}
        haptic
        accessibilityRole="button"
        accessibilityState={{ disabled: item.done }}
        style={[styles.row, surfaceElevation(t), item.done && styles.rowDone]}
      >
        <View style={[styles.check, item.done ? { backgroundColor: t.cobalt } : { borderWidth: 2, borderColor: t.line }]}>
          {item.done && <Icon name="check" size={13} color="#fff" strokeWidth={3} />}
        </View>
        <View style={{ flex: 1 }}>
          <AppText variant="medium" muted={item.done} style={item.done ? styles.strike : undefined} numberOfLines={2}>
            {item.challenge.text}
          </AppText>
          <View style={styles.rowMeta}>
            <Icon name={style.icon} size={12} color={style.color} />
            <AppText variant="caption" color={style.color}>{item.dimLabel}</AppText>
            {item.done && item.doneAt && (
              <AppText variant="caption" muted>
                {' \u2022 '}
                {new Date(item.doneAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              </AppText>
            )}
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/* ---------------------------- screen ---------------------------- */

function TodayContent() {
  const t = useTheme();
  const nav = useNavigation<TabScreenNav<'Today'>>();
  const { state, swipeCandidate } = useStore();
  const { session } = useAuth();
  const quests = useTodayQuests();

  if (!quests) return <View style={{ flex: 1 }} />;
  const { pool, accepted, completedCount, total } = quests;
  const name = displayName(state.name, session?.user.email);
  const nothingChosen = pool.length === 0 && total === 0;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <StaggerIn index={0} style={styles.headerRow}>
        <View>
          <AppText variant="medium" muted>{greeting()}{name ? ',' : ''}</AppText>
          {!!name && <AppText variant="title" style={{ marginTop: 2 }}>{name}</AppText>}
        </View>
        <StreakChip streak={state.streak} />
      </StaggerIn>

      <StaggerIn index={1}>
        <AppText variant="small" muted style={{ marginTop: -4 }}>
          Pick as many, or as few, as you're up for today.
        </AppText>
      </StaggerIn>

      <StaggerIn index={2}>
        <SwipeStack pool={pool} onSwipe={swipeCandidate} />
      </StaggerIn>

      {nothingChosen ? (
        <StaggerIn index={3}>
          <AppText variant="small" muted style={{ textAlign: 'center', marginTop: 4 }}>
            Nothing added yet today — that's alright too.
          </AppText>
        </StaggerIn>
      ) : total > 0 ? (
        <>
          <StaggerIn index={3} style={styles.progressRow}>
            <AppText variant="label" style={{ fontSize: 16 }}>Your progress today</AppText>
            <AppText variant="small" muted>{completedCount} of {total} completed</AppText>
          </StaggerIn>
          <StaggerIn index={4}>
            <View style={[styles.track, { backgroundColor: t.line }]}>
              <View style={[styles.fill, { backgroundColor: t.cobalt, width: `${(completedCount / total) * 100}%` }]} />
            </View>
          </StaggerIn>

          <View style={styles.checklist}>
            {accepted.map((item, i) => (
              <ChecklistRow key={item.id} item={item} index={i} onPress={() => nav.navigate('Focus', { itemId: item.id })} />
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

/** Act starts here: swipe through today's candidates, then work the ones you kept. */
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
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill },

  stackArea: { height: 300 },
  cardAbs: { position: 'absolute', left: 0, right: 0, top: 0 },
  heroShadow: { borderRadius: radius.xl, ...glowElevation(brand.cobalt, 0.3) },
  hero: { borderRadius: radius.xl, padding: 20, overflow: 'hidden', minHeight: 280, justifyContent: 'space-between' },
  heroTitle: { fontSize: 24, lineHeight: 28, marginTop: 10 },
  heroMeta: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 11, paddingVertical: 6, borderRadius: radius.pill },
  quote: { fontStyle: 'italic', marginTop: 14 },

  stamp: {
    position: 'absolute',
    top: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 2.5,
  },
  stampAccept: { left: 18, borderColor: '#5FE3A6', transform: [{ rotate: '-14deg' }] },
  stampDecline: { right: 18, borderColor: '#FF8C8C', transform: [{ rotate: '14deg' }] },
  stampText: { fontSize: 15, letterSpacing: 1.5 },

  swipeButtons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, paddingHorizontal: 8 },
  swipeBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  swipeBtnAccept: { backgroundColor: brand.cobalt },

  emptyStack: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.lg, padding: 16 },

  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 4 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },

  checklist: { gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radius.lg },
  rowDone: { opacity: 0.6 },
  strike: { textDecorationLine: 'line-through' },
  check: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  rowMeta: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
});
