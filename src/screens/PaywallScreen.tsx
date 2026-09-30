import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { PressableScale } from '../components/PressableScale';
import { RootStackParamList } from '../navigation/types';
import { useMonetization } from '../state/monetization';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radius, surfaceElevation } from '../theme/tokens';

type Props = NativeStackScreenProps<RootStackParamList, 'Paywall'>;

export function PaywallScreen({ navigation }: Props) {
  const t = useTheme();
  const { state } = useStore();
  const { status, isPro, offering, error, purchase, restore, redeemJudgeCode, refresh } = useMonetization();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [judgeCode, setJudgeCode] = useState('');
  const [showJudgeEntry, setShowJudgeEntry] = useState(false);

  const packages = useMemo(() => offering?.availablePackages ?? [], [offering]);
  const selectedPackage = packages.find((p) => p.identifier === selected)
    ?? packages.find((p) => p.packageType === 'ANNUAL')
    ?? packages.find((p) => p.packageType === 'MONTHLY')
    ?? packages[0];

  React.useEffect(() => {
    if (isPro) navigation.popTo('Main', { screen: 'Today' });
  }, [isPro, navigation]);

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    try { await fn(); } catch { /* The provider exposes the purchase or redemption error. */ }
    finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={{ flex: 1 }} />
          <PressableScale onPress={() => navigation.popTo('Main', { screen: 'Today' })} accessibilityRole="button" accessibilityLabel="Close Go Beyond Pro">
            <AppText variant="label" muted style={styles.close}>Close</AppText>
          </PressableScale>
        </View>

        <View style={styles.hero}>
          <AppText variant="caption" color={t.accent} style={styles.eyebrow}>GO BEYOND PRO</AppText>
          <AppText variant="display" style={styles.title}>Keep moving your edge.</AppText>
          <AppText variant="body" muted style={styles.intro}>
            {state.completedChallengeCount >= 5
              ? 'You’ve completed your first five challenges. Go Pro to keep building momentum with a plan that grows with you.'
              : 'Build momentum with unlimited personalized challenges and a plan that grows with you.'}
          </AppText>
        </View>

        <View style={styles.benefits}>
          {[
            ['∞', 'Unlimited challenges'],
            ['✦', 'Advanced personalization and adaptive difficulty'],
            ['↗', 'A daily Push Me challenge that stretches you further'],
            ['◷', 'Six-dimension zone graph and detailed progress tracking'],
          ].map(([symbol, label]) => (
            <View key={label} style={styles.benefit}>
              <View style={[styles.symbol, { backgroundColor: t.tint }]}><AppText variant="label" color={t.accent}>{symbol}</AppText></View>
              <AppText variant="body" style={{ flex: 1 }}>{label}</AppText>
            </View>
          ))}
        </View>

        {status === 'loading' ? (
          <View style={styles.loading}><ActivityIndicator color={t.accent} /><AppText variant="small" muted>Loading plans…</AppText></View>
        ) : packages.length ? (
          <View style={styles.plans}>
            {packages.map((item) => {
              const isAnnual = item.packageType === 'ANNUAL';
              const isSelected = (selectedPackage?.identifier ?? '') === item.identifier;
              return (
                <PressableScale key={item.identifier} onPress={() => setSelected(item.identifier)} accessibilityRole="radio" accessibilityState={{ selected: isSelected }}>
                  <View style={[styles.plan, surfaceElevation(t), isSelected && { borderColor: t.accent, borderWidth: 2 }]}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="label">{isAnnual ? 'Yearly' : item.packageType === 'MONTHLY' ? 'Monthly' : item.product.title}</AppText>
                      {isAnnual && <AppText variant="caption" color={t.accent}>Best value</AppText>}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="label">{item.product.priceString}</AppText>
                      <AppText variant="caption" muted>{isAnnual ? 'per year' : 'per month'}</AppText>
                    </View>
                  </View>
                </PressableScale>
              );
            })}
            <Button
              label={busy ? 'Please wait…' : selectedPackage ? `Continue with ${selectedPackage.product.priceString}` : 'Choose a plan'}
              disabled={busy || !selectedPackage}
              onPress={() => selectedPackage && act(() => purchase(selectedPackage))}
            />
            <Button variant="ghost" label="Restore purchases" disabled={busy} onPress={() => act(restore)} />
          </View>
        ) : (
          <View style={[styles.setupCard, surfaceElevation(t)]}>
            <AppText variant="label">Plans are temporarily unavailable</AppText>
            <AppText variant="small" muted style={{ marginTop: 6 }}>Check your connection or finish configuring the Go Beyond Pro offering in RevenueCat.</AppText>
            <Button variant="light" label="Try again" onPress={() => act(refresh)} style={{ marginTop: 12 }} />
            <Button variant="ghost" label="Restore purchases" disabled={busy} onPress={() => act(restore)} />
          </View>
        )}

        {!!error && <AppText variant="small" color={t.ember} style={styles.error}>{error}</AppText>}

        <View style={styles.footer}>
          <AppText variant="caption" muted style={{ textAlign: 'center' }}>Subscriptions are managed by your app store. Restore purchases any time.</AppText>
          <PressableScale onPress={() => setShowJudgeEntry((v) => !v)} accessibilityRole="button" style={{ alignSelf: 'center', marginTop: 14 }}>
            <AppText variant="caption" muted>Have a Shipaton judge code?</AppText>
          </PressableScale>
          {showJudgeEntry && (
            <View style={{ marginTop: 12 }}>
              <TextInput
                value={judgeCode}
                onChangeText={setJudgeCode}
                placeholder="Enter judge code"
                placeholderTextColor={t.muted}
                autoCapitalize="characters"
                autoCorrect={false}
                accessibilityLabel="Shipaton judge access code"
                style={[styles.codeInput, { color: t.ink, borderColor: t.line, backgroundColor: t.surface }]}
              />
              <Button label={busy ? 'Activating…' : 'Activate judge access'} disabled={busy || !judgeCode.trim()} onPress={() => act(() => redeemJudgeCode(judgeCode))} />
            </View>
          )}
          <AppText variant="caption" muted style={styles.terms}>Terms and privacy details are available in the app store listing.</AppText>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: 22, paddingTop: 10, paddingBottom: 36 },
  header: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  close: { padding: 8 },
  hero: { marginTop: 18 },
  eyebrow: { letterSpacing: 1.8, fontSize: 12 },
  title: { marginTop: 8 },
  intro: { marginTop: 10, lineHeight: 23 },
  benefits: { gap: 14, marginTop: 25, marginBottom: 26 },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  symbol: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', borderRadius: 17 },
  plans: { gap: 10 },
  plan: { minHeight: 72, borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 13, flexDirection: 'row', alignItems: 'center' },
  loading: { alignItems: 'center', gap: 10, paddingVertical: 30 },
  setupCard: { padding: 16, borderRadius: radius.lg },
  error: { marginTop: 12, textAlign: 'center' },
  footer: { marginTop: 18 },
  codeInput: { height: 48, borderWidth: 1, borderRadius: radius.md, paddingHorizontal: 14, marginBottom: 10, fontFamily: fonts.body },
  terms: { textAlign: 'center', marginTop: 16 },
});
