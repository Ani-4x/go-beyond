import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { FEELINGS, MOMENT_CATEGORIES } from '../data/content';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, glowElevation } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { PressableScale } from './PressableScale';
import { usePop } from './usePop';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (m: { title: string; tag: string; feel?: string }) => void;
};

function CategoryCard({ label, hint, selected, onPress }: { label: string; hint: string; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  const pop = usePop(selected);
  return (
    <Animated.View style={[styles.cardWrap, pop]}>
      <PressableScale
        haptic
        scaleTo={0.96}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        style={[
          styles.card,
          { borderColor: selected ? t.accent : t.line, backgroundColor: selected ? t.tint : t.bg },
          selected ? glowElevation(t.accent, 0.14) : null,
        ]}
      >
        <AppText variant="label" style={{ fontSize: 15 }}>{label}</AppText>
        <AppText variant="caption" muted style={{ fontFamily: fonts.body }}>{hint}</AppText>
      </PressableScale>
    </Animated.View>
  );
}

/** "What happened?" as a bottom sheet: springs up, slides away on close. */
export function CaptureSheet({ visible, onClose, onSave }: Props) {
  const t = useTheme();
  const [mounted, setMounted] = useState(visible);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [feel, setFeel] = useState<string | null>(null);

  const y = useSharedValue(700);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = 700;
      fade.value = withTiming(1, { duration: 250 });
      y.value = withSpring(0, { damping: 20, stiffness: 180, mass: 0.9 });
    } else {
      fade.value = withTiming(0, { duration: 220 });
      y.value = withTiming(700, { duration: 240, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, y, fade]);

  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  const canSave = title.trim().length > 0 && tag !== null;
  const save = () => {
    if (!canSave || !tag) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSave({ title: title.trim(), tag, feel: feel ?? undefined });
    setTitle('');
    setTag(null);
    setFeel(null);
  };

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.backdrop }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[styles.sheet, { backgroundColor: t.surface }, sheet]}>
            <View style={[styles.grab, { backgroundColor: t.line }]} />
            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <AppText variant="title" style={{ marginBottom: 14 }}>What happened?</AppText>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder="A walk after work"
                placeholderTextColor={t.muted}
                maxLength={80}
                returnKeyType="done"
                style={[styles.input, { backgroundColor: t.bg, borderColor: title ? t.accent : t.line, color: t.ink }]}
              />
              <AppText variant="label" style={styles.q}>What kind of moment was it?</AppText>
              <View style={styles.grid}>
                {MOMENT_CATEGORIES.map((c) => (
                  <CategoryCard key={c.key} label={c.key} hint={c.hint} selected={tag === c.key} onPress={() => setTag(c.key)} />
                ))}
              </View>
              <AppText variant="label" style={styles.q}>
                How did it feel? <AppText variant="body" muted>Optional</AppText>
              </AppText>
              <View style={styles.chips}>
                {FEELINGS.map((f) => (
                  <Chip key={f} label={f} selected={feel === f} onPress={() => setFeel(feel === f ? null : f)} />
                ))}
              </View>
              <Button label="Save moment" disabled={!canSave} onPress={save} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 28, maxHeight: '92%' },
  grab: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  input: { height: 52, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 16, marginBottom: 18 },
  q: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  cardWrap: { width: '48.6%' },
  card: { padding: 12, borderRadius: 14, borderWidth: 1.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
});
