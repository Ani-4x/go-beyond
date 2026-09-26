import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { StaggerIn } from '../components/StaggerIn';
import { useReplayKey } from '../lib/hooks';
import type { TabParamList } from '../navigation/types';
import { useAuth } from '../state/auth';
import { useStore } from '../state/store';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { brand, fonts, gradients, glowElevation, radius, surfaceElevation } from '../theme/tokens';

function StatCard({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <View style={[styles.stat, surfaceElevation(t)]}>
      <AppText variant="title" style={{ fontSize: 22 }}>{value}</AppText>
      <AppText variant="caption" muted style={{ marginTop: 2 }}>{label}</AppText>
    </View>
  );
}

/** Tap the pencil to edit; the check saves, the x discards. */
function NameField({ name, email }: { name: string | null; email: string }) {
  const t = useTheme();
  const { setName } = useStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name ?? '');

  const save = () => {
    setName(draft);
    setEditing(false);
  };

  if (editing) {
    return (
      <View style={styles.nameEditRow}>
        <TextInput
          autoFocus
          value={draft}
          onChangeText={setDraft}
          placeholder="Your name"
          placeholderTextColor={t.muted}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={save}
          style={[styles.nameInput, surfaceElevation(t), { color: t.ink }]}
        />
        <PressableScale
          onPress={save}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Save name"
          style={[styles.nameBtn, { backgroundColor: t.cobalt }]}
        >
          <Icon name="check" size={16} color="#fff" strokeWidth={2.8} />
        </PressableScale>
        <PressableScale
          onPress={() => {
            setDraft(name ?? '');
            setEditing(false);
          }}
          scaleTo={0.88}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
          style={[styles.nameBtn, surfaceElevation(t)]}
        >
          <Icon name="close" size={16} color={t.ink} />
        </PressableScale>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.nameRow}>
        <AppText variant="label" style={{ fontSize: 18 }} numberOfLines={1}>
          {name || 'Add your name'}
        </AppText>
        <PressableScale
          onPress={() => {
            setDraft(name ?? '');
            setEditing(true);
          }}
          scaleTo={0.85}
          accessibilityRole="button"
          accessibilityLabel="Edit name"
          style={styles.editBtn}
        >
          <Icon name="edit" size={14} color={t.muted} />
        </PressableScale>
      </View>
      <AppText variant="small" muted numberOfLines={1} style={{ marginTop: 2 }}>{email}</AppText>
    </View>
  );
}

function ProfileContent() {
  const t = useTheme();
  const { session, signOut } = useAuth();
  const { state, resetAll } = useStore();
  const [confirmingReset, setConfirmingReset] = useState(false);

  const email = session?.user.email ?? '';
  const initial = (state.name || email).charAt(0).toUpperCase() || '?';
  const level = Math.floor(state.xp / 100) + 1;
  const into = (state.xp % 100) / 100;
  const xp = useSharedValue(0);
  React.useEffect(() => {
    xp.value = withDelay(400, withTiming(into, { duration: 1000, easing: ease }));
  }, [into, xp]);
  const xpStyle = useAnimatedStyle(() => ({ width: `${Math.min(1, Math.max(0, xp.value)) * 100}%` }));

  const challenges = state.entries.filter((e) => e.type === 'challenge').length;
  const moments = state.entries.filter((e) => e.type === 'moment').length;

  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
      <StaggerIn index={0}>
        <AppText variant="display">Profile</AppText>
      </StaggerIn>

      <StaggerIn index={1} style={styles.identity}>
        <View style={[styles.avatarShadow, glowElevation(brand.cobalt, 0.3)]}>
          <LinearGradient colors={gradients.cobalt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatar}>
            <AppText variant="title" color="#fff" style={{ fontSize: 26 }}>{initial}</AppText>
          </LinearGradient>
        </View>
        <NameField name={state.name} email={email} />
      </StaggerIn>

      <StaggerIn index={2} style={[styles.card, surfaceElevation(t)]}>
        <View style={styles.xpHead}>
          <AppText variant="label">Level {level}</AppText>
          <AppText variant="caption" muted>{state.xp % 100} / 100 XP</AppText>
        </View>
        <View style={[styles.xpTrack, { backgroundColor: t.line }]}>
          <Animated.View style={[styles.xpFill, xpStyle]}>
            <LinearGradient colors={gradients.cobalt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </StaggerIn>

      <StaggerIn index={3} style={styles.statsRow}>
        <StatCard label="Challenges done" value={String(challenges)} />
        <StatCard label="Moments logged" value={String(moments)} />
        <StatCard label="Day streak" value={String(state.streak)} />
      </StaggerIn>

      <StaggerIn index={4} style={{ marginTop: 28 }}>
        <AppText variant="label" muted style={{ marginBottom: 10, fontSize: 14 }}>Account</AppText>
        <Button
          variant="light"
          label="Sign out"
          onPress={() => {
            Haptics.selectionAsync().catch(() => {});
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
          }}
        />
      </StaggerIn>
    </ScrollView>
  );
}

/** Who you are, and the doors out: sign out, or start over. */
export function ProfileScreen(_props: BottomTabScreenProps<TabParamList, 'Profile'>) {
  const t = useTheme();
  const replay = useReplayKey();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top']}>
      <ProfileContent key={replay} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 150 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 20 },
  avatarShadow: { borderRadius: 32 },
  avatar: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { padding: 4 },
  nameEditRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameInput: { flex: 1, height: 42, borderRadius: 14, borderWidth: 1.5, paddingHorizontal: 14, fontFamily: fonts.medium, fontSize: 16 },
  nameBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: radius.lg, padding: 16, marginTop: 22 },
  xpHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4, overflow: 'hidden' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  stat: { flex: 1, borderRadius: radius.lg, padding: 14, alignItems: 'flex-start' },
});
