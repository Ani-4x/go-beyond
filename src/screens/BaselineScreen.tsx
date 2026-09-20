import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInRight,
  FadeOutLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { SegmentedProgress } from '../components/SegmentedProgress';
import { WordReveal } from '../components/StaggerIn';
import { QUESTIONS } from '../data/content';
import type { RootStackParamList } from '../navigation/types';
import { useStore } from '../state/store';
import { ease, spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';

function OptionRow({ label, selected, index, onPress }: { label: string; selected: boolean; index: number; onPress: () => void }) {
  const t = useTheme();
  const dot = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    dot.value = withSpring(selected ? 1 : 0, spring.bouncy);
  }, [selected, dot]);
  const inner = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0, dot.value) }] }));

  return (
    <Animated.View entering={FadeInDown.delay(450 + index * 80).duration(500).easing(ease)}>
      <PressableScale
        haptic
        scaleTo={0.98}
        onPress={onPress}
        accessibilityRole="radio"
        accessibilityState={{ selected }}
        style={[styles.option, { backgroundColor: selected ? t.tint : t.surface, borderColor: selected ? t.accent : t.line }]}
      >
        <View style={[styles.dot, { borderColor: selected ? t.accent : t.line, backgroundColor: selected ? t.accent : 'transparent' }]}>
          <Animated.View style={[styles.dotInner, { backgroundColor: t.bg }, inner]} />
        </View>
        <AppText variant="medium" style={{ flex: 1 }}>{label}</AppText>
      </PressableScale>
    </Animated.View>
  );
}

/** Understand: one situational question per screen. */
export function BaselineScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Baseline'>) {
  const t = useTheme();
  const { finishBaseline } = useStore();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);

  const q = QUESTIONS[index];
  const selected = answers[index];
  const last = index === QUESTIONS.length - 1;

  const choose = (i: number) =>
    setAnswers((prev) => {
      const next = [...prev];
      next[index] = i;
      return next;
    });

  const next = () => {
    if (last) {
      finishBaseline(answers);
      navigation.navigate('Reveal');
    } else {
      setIndex((i) => i + 1);
    }
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <View style={styles.top}>
        <View style={{ opacity: index === 0 ? 0.35 : 1 }}>
          <PressableScale
            disabled={index === 0}
            onPress={() => setIndex((i) => Math.max(0, i - 1))}
            scaleTo={0.9}
            accessibilityLabel="Back"
            style={[styles.back, { backgroundColor: t.surface, borderColor: t.line }]}
          >
            <Icon name="back" color={t.ink} />
          </PressableScale>
        </View>
        <SegmentedProgress total={QUESTIONS.length} done={index + 1} />
        <AppText variant="caption" muted style={styles.count}>{index + 1}/{QUESTIONS.length}</AppText>
      </View>

      <Animated.View
        key={index}
        entering={FadeInRight.duration(380).easing(ease)}
        exiting={FadeOutLeft.duration(200)}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <WordReveal text={q.prompt} />
          <AppText variant="small" muted style={{ marginTop: 10 }}>No right answers. This only sets your starting point.</AppText>
          <View style={styles.options} accessibilityRole="radiogroup">
            {q.options.map((o, i) => (
              <OptionRow key={o} label={o} index={i} selected={selected === i} onPress={() => choose(i)} />
            ))}
          </View>
        </ScrollView>
      </Animated.View>

      <View style={styles.dock}>
        <Button label={last ? 'See my zone' : 'Continue'} disabled={selected === undefined} onPress={next} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, paddingTop: 18, paddingBottom: 26 },
  back: { width: 40, height: 40, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  count: { minWidth: 28, textAlign: 'right' },
  body: { paddingHorizontal: 22, paddingBottom: 20 },
  options: { gap: 10, marginTop: 26 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 18, paddingVertical: 16, borderRadius: 18, borderWidth: 1.5 },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  dotInner: { width: 8, height: 8, borderRadius: 4 },
  dock: { paddingHorizontal: 22, paddingBottom: 12, paddingTop: 8 },
});
