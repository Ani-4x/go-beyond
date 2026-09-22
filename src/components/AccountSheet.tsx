import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { useAuth } from '../state/auth';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { AppText } from './AppText';
import { Button } from './Button';

type Props = { visible: boolean; onClose: () => void };

/** Sign out, or start over. Reached from the small account icon on the Zone screen. */
export function AccountSheet({ visible, onClose }: Props) {
  const t = useTheme();
  const { session, signOut } = useAuth();
  const { resetAll } = useStore();
  const [mounted, setMounted] = useState(visible);
  const [confirmingReset, setConfirmingReset] = useState(false);

  const y = useSharedValue(400);
  const fade = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      setConfirmingReset(false);
      y.value = 400;
      fade.value = withTiming(1, { duration: 250 });
      y.value = withSpring(0, { damping: 20, stiffness: 180, mass: 0.9 });
    } else {
      fade.value = withTiming(0, { duration: 220 });
      y.value = withTiming(400, { duration: 240, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) scheduleOnRN(setMounted, false);
      });
    }
  }, [visible, y, fade]);

  const backdrop = useAnimatedStyle(() => ({ opacity: fade.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  return (
    <Modal visible={mounted} transparent animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.backdrop }, backdrop]}>
          <Pressable style={{ flex: 1 }} onPress={onClose} accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { backgroundColor: t.surface }, sheet]}>
          <View style={[styles.grab, { backgroundColor: t.line }]} />
          <AppText variant="title" style={{ marginBottom: 4 }}>Account</AppText>
          <AppText variant="small" muted style={{ marginBottom: 22 }}>{session?.user.email}</AppText>

          <Button
            variant="light"
            label="Sign out"
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onClose();
              signOut();
            }}
            style={{ marginBottom: 10 }}
          />
          <Button
            variant="ghost"
            color={t.ember}
            label={confirmingReset ? 'Tap again to erase everything' : 'Reset my data'}
            onPress={() => {
              if (!confirmingReset) {
                setConfirmingReset(true);
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
                return;
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
              resetAll();
              onClose();
            }}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 12, paddingBottom: 36 },
  grab: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
});
