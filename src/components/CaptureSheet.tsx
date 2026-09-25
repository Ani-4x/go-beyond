import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { FEELINGS, MOMENT_CATEGORIES } from '../data/content';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, glowElevation, surfaceElevation } from '../theme/tokens';
import { AppText } from './AppText';
import { Button } from './Button';
import { Chip } from './Chip';
import { Icon } from './Icons';
import { PressableScale } from './PressableScale';
import { usePop } from './usePop';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSave: (m: { title: string; tag: string; feel?: string; note?: string }) => void;
};

const TITLE_MAX = 200;

function CategoryCard({
  label,
  hint,
  color,
  icon,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  color: string;
  icon: React.ComponentProps<typeof Icon>['name'];
  selected: boolean;
  onPress: () => void;
}) {
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
          { borderColor: selected ? color : t.line, backgroundColor: selected ? color + '1c' : t.surface },
          selected ? glowElevation(color, 0.16) : null,
        ]}
      >
        <View style={[styles.cardIcon, { backgroundColor: color + '26' }]}>
          <Icon name={icon} size={18} color={color} />
        </View>
        <AppText variant="label" style={{ fontSize: 15 }}>{label}</AppText>
        <AppText variant="caption" muted style={{ fontFamily: fonts.body }}>{hint}</AppText>
      </PressableScale>
    </Animated.View>
  );
}

/** "What happened?" as a full-screen capture flow: slides up over everything. */
export function CaptureSheet({ visible, onClose, onSave }: Props) {
  const t = useTheme();
  const [mounted, setMounted] = useState(visible);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [feel, setFeel] = useState<string | null>(null);
  const [note, setNote] = useState('');

  const y = useSharedValue(60);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      y.value = 60;
      fade.value = withTiming(1, { duration: 260 });
      y.value = withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) });
    } else {
      fade.value = withTiming(0, { duration: 200 });
      y.value = withTiming(60, { duration: 220, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, y, fade]);

  const bodyStyle = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ translateY: y.value }] }));

  const canSave = title.trim().length > 0 && tag !== null;
  const save = () => {
    if (!canSave || !tag) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onSave({ title: title.trim(), tag, feel: feel ?? undefined, note: note.trim() || undefined });
    setTitle('');
    setTag(null);
    setFeel(null);
    setNote('');
  };

  return (
    <Modal visible={mounted} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <Animated.View style={[{ flex: 1 }, bodyStyle]}>
            <View style={styles.topRow}>
              <PressableScale
                onPress={onClose}
                scaleTo={0.9}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={[styles.close, surfaceElevation(t)]}
              >
                <Icon name="close" color={t.ink} size={18} />
              </PressableScale>
            </View>
            <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <AppText variant="display" style={{ marginBottom: 14 }}>What happened?</AppText>
              <TextInput
                value={title}
                onChangeText={(v) => setTitle(v.slice(0, TITLE_MAX))}
                placeholder="A walk after work"
                placeholderTextColor={t.muted}
                maxLength={TITLE_MAX}
                returnKeyType="done"
                style={[styles.input, surfaceElevation(t), title ? { borderColor: t.accent } : null, { color: t.ink }]}
              />
              <AppText variant="caption" muted style={styles.counter}>{title.length}/{TITLE_MAX}</AppText>

              <AppText variant="label" style={styles.q}>What kind of moment was it?</AppText>
              <View style={styles.grid}>
                {MOMENT_CATEGORIES.map((c) => (
                  <CategoryCard
                    key={c.key}
                    label={c.key}
                    hint={c.hint}
                    color={c.color}
                    icon={c.icon}
                    selected={tag === c.key}
                    onPress={() => setTag(c.key)}
                  />
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

              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a note (optional)"
                placeholderTextColor={t.muted}
                multiline
                style={[styles.note, surfaceElevation(t), { color: t.ink }]}
              />

              <Button label="Save moment" disabled={!canSave} onPress={save} style={{ marginTop: 22 }} />
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topRow: { flexDirection: 'row', paddingHorizontal: 22, paddingTop: 6, paddingBottom: 4 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 30 },
  input: { height: 54, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, fontFamily: fonts.body, fontSize: 16 },
  counter: { textAlign: 'right', marginTop: 6, marginBottom: 18 },
  q: { marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  cardWrap: { width: '48.6%' },
  card: { padding: 12, borderRadius: 14, borderWidth: 1.5, gap: 6 },
  cardIcon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18 },
  note: { minHeight: 90, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, paddingVertical: 14, fontFamily: fonts.body, fontSize: 15, textAlignVertical: 'top' },
});
