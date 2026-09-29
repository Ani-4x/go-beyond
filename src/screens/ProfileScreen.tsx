import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import React, { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { StaggerIn } from '../components/StaggerIn';
import { useReplayKey } from '../lib/hooks';
import type { TabParamList, TabScreenNav } from '../navigation/types';
import { useAuth } from '../state/auth';
import { useStore } from '../state/store';
import { useMonetization } from '../state/monetization';
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
  const { session, signOut, deleteAccount } = useAuth();
  const { state, resetAll } = useStore();
  const { isPro, manageSubscription } = useMonetization();
  const navigation = useNavigation<TabScreenNav<'Profile'>>();
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [deleteConfirmationVisible, setDeleteConfirmationVisible] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
  const [subscriptionNotice, setSubscriptionNotice] = useState<string | null>(null);

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

  const performAccountDeletion = async () => {
    setDeletingAccount(true);
    setDeleteAccountError(null);
    try {
      await deleteAccount();
    } catch (error) {
      setDeleteAccountError(error instanceof Error ? error.message : 'We could not delete your account. Please try again.');
    } finally {
      setDeletingAccount(false);
    }
  };

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
        <View style={[styles.card, surfaceElevation(t), { marginTop: 0, marginBottom: 22 }]}>
          <View style={styles.proHeader}>
            <AppText variant="label">Go Beyond Pro</AppText>
            {isPro && <AppText variant="caption" color="#65D6A2">ACTIVE</AppText>}
          </View>
          <AppText variant="small" muted style={{ marginTop: 4 }}>
            {isPro ? 'Unlimited challenges, Push Me, and zone insights.' : `${Math.min(state.completedChallengeCount, 5)} of 5 free challenges completed.`}
          </AppText>
          {isPro && (
            <PressableScale
              onPress={() => manageSubscription().catch((error: unknown) => {
                setSubscriptionNotice(error instanceof Error ? error.message : 'Could not open subscription settings.');
              })}
              accessibilityRole="button"
              accessibilityLabel="Manage or cancel subscription"
              style={styles.manageSubscriptionButton}
            >
              <AppText variant="small" color="#FF6574">Manage subscription</AppText>
              <Icon name="chevronRight" size={15} color="#FF6574" />
            </PressableScale>
          )}
          {!isPro && <Button label="Explore Pro" onPress={() => navigation.navigate('Paywall')} style={{ marginTop: 12 }} />}
        </View>
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
        <View style={styles.dangerZone}>
          <AppText variant="label" color="#FF6574">Danger zone</AppText>
          <AppText variant="caption" muted style={{ marginTop: 4 }}>
            Permanently remove your account and all Go Beyond data.
          </AppText>
          <PressableScale
            onPress={() => {
              setDeleteAccountError(null);
              setDeleteConfirmationVisible(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Delete account permanently"
            style={styles.deleteAccountButton}
          >
            <AppText variant="small" color="#FF6574">Delete account</AppText>
          </PressableScale>
        </View>
      </StaggerIn>
      <Modal
        visible={deleteConfirmationVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => !deletingAccount && setDeleteConfirmationVisible(false)}
      >
        <View style={[styles.confirmationBackdrop, { backgroundColor: t.backdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => !deletingAccount && setDeleteConfirmationVisible(false)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss account deletion confirmation"
          />
          <View style={[styles.confirmationCard, surfaceElevation(t)]} accessibilityViewIsModal>
            <View style={styles.confirmationIcon}>
              <Icon name="trash" size={21} color="#FF6574" />
            </View>
            <AppText variant="title">Delete your account?</AppText>
            <AppText variant="small" muted style={{ marginTop: 9, lineHeight: 21 }}>
              Your profile, challenge history, and moments will be permanently deleted.
            </AppText>
            <AppText variant="small" muted style={{ marginTop: 8, lineHeight: 21 }}>
              This does not cancel an App Store or Google Play subscription. Cancel it in Manage subscription before deleting your account.
            </AppText>
            {!!deleteAccountError && (
              <AppText variant="caption" color="#FF6574" style={{ marginTop: 12 }}>
                {deleteAccountError}
              </AppText>
            )}
            <View style={styles.confirmationActions}>
              <PressableScale
                onPress={() => setDeleteConfirmationVisible(false)}
                disabled={deletingAccount}
                accessibilityRole="button"
                style={[styles.confirmationButton, { backgroundColor: t.tint }]}
              >
                <AppText variant="small">Keep account</AppText>
              </PressableScale>
              <PressableScale
                onPress={performAccountDeletion}
                disabled={deletingAccount}
                accessibilityRole="button"
                style={[styles.confirmationButton, styles.confirmDeleteButton]}
              >
                {deletingAccount
                  ? <ActivityIndicator color="#FFFFFF" />
                  : <AppText variant="small" color="#FFFFFF">Delete account</AppText>}
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={subscriptionNotice !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setSubscriptionNotice(null)}
      >
        <View style={[styles.confirmationBackdrop, { backgroundColor: t.backdrop }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setSubscriptionNotice(null)}
            accessibilityRole="button"
            accessibilityLabel="Dismiss subscription notice"
          />
          <View style={[styles.confirmationCard, surfaceElevation(t)]} accessibilityViewIsModal>
            <View style={[styles.confirmationIcon, { backgroundColor: t.tint }]}>
              <Icon name="gear" size={20} color={t.accent} />
            </View>
            <AppText variant="title">Subscription settings</AppText>
            <AppText variant="small" muted style={{ marginTop: 9, lineHeight: 21 }}>
              {subscriptionNotice}
            </AppText>
            <PressableScale
              onPress={() => setSubscriptionNotice(null)}
              accessibilityRole="button"
              style={[styles.noticeButton, { backgroundColor: t.tint }]}
            >
              <AppText variant="small">Got it</AppText>
            </PressableScale>
          </View>
        </View>
      </Modal>
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
  proHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  manageSubscriptionButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 12, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 13, backgroundColor: 'rgba(255,101,116,0.12)', borderWidth: 1, borderColor: 'rgba(255,101,116,0.3)' },
  dangerZone: { marginTop: 24, padding: 16, borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(255,101,116,0.25)', backgroundColor: 'rgba(255,101,116,0.055)' },
  deleteAccountButton: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 2, paddingVertical: 6 },
  confirmationBackdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmationCard: { width: '100%', maxWidth: 420, padding: 22, borderRadius: 24 },
  confirmationIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,101,116,0.14)', marginBottom: 16 },
  confirmationActions: { flexDirection: 'row', gap: 10, marginTop: 22 },
  confirmationButton: { minHeight: 46, flex: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  confirmDeleteButton: { backgroundColor: '#D94758' },
  noticeButton: { minHeight: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
});
