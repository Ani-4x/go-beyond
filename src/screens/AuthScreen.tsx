import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Bloom, ZoneGlyph } from '../components/Decor';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { WordReveal } from '../components/StaggerIn';
import { useAuth } from '../state/auth';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, radius, surfaceElevation } from '../theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign in with a one-time code, creating an account on first use. */
export function AuthScreen() {
  const t = useTheme();
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [codeFocused, setCodeFocused] = useState(false);
  const codeInput = useRef<TextInput>(null);

  const submitEmail = async () => {
    if (!EMAIL_RE.test(email.trim()) || busy) return;
    setBusy(true);
    setError(null);
    const wasCodeStep = step === 'code';
    const { error: err } = await sendCode(email);
    setBusy(false);
    if (err) { setError(err); return; }
    setCode('');
    setResent(wasCodeStep);
    setStep('code');
    setTimeout(() => codeInput.current?.focus(), 350);
  };

  const submitCode = async () => {
    if (code.length !== 8 || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await verifyCode(email, code);
    setBusy(false);
    if (err) setError(err);
    // On success, onAuthStateChange flips the app over automatically.
  };

  const changeEmail = () => {
    setStep('email');
    setCode('');
    setError(null);
    setResent(false);
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <Bloom size={310} color={t.accent} opacity={t.scheme === 'dark' ? 0.22 : 0.12} style={styles.topBloom} />
      <Bloom size={230} color={t.ember} opacity={0.09} style={styles.bottomBloom} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            {step === 'email' ? (
              <View style={styles.brand}>
                <View style={[styles.brandIcon, { backgroundColor: t.tint }]}><Icon name="rings" size={21} color={t.accent} /></View>
                <AppText variant="label" style={styles.brandText}>GO BEYOND</AppText>
              </View>
            ) : (
              <PressableScale onPress={changeEmail} accessibilityRole="button" accessibilityLabel="Change email address" style={styles.backLink}>
                <Icon name="back" size={18} color={t.accent} />
                <AppText variant="small" color={t.accent}>Change email</AppText>
              </PressableScale>
            )}
            <View style={[styles.stepBadge, { backgroundColor: t.tint }]}>
              <AppText variant="caption" color={t.accent}>{step === 'email' ? '01 / 02' : '02 / 02'}</AppText>
            </View>
          </View>

          {step === 'email' ? (
            <Animated.View key="email" entering={FadeInRight.duration(380).easing(ease)} exiting={FadeOutLeft.duration(200)} style={styles.content}>
              <View style={styles.hero}>
                <View style={[styles.art, { backgroundColor: t.tint, borderColor: t.line }]}>
                  <ZoneGlyph size={118} accent={t.accent} ember={t.ember} muted={t.muted} />
                </View>
                <AppText variant="caption" color={t.accent} style={styles.eyebrow}>A SMALL STEP, A BIGGER ZONE</AppText>
                <WordReveal text="Let's find your zone." style={styles.title} />
                <AppText variant="body" muted style={styles.subtitle}>Start with your email. We’ll send you a code to open your space to grow.</AppText>
              </View>

              <View style={[styles.formCard, surfaceElevation(t)]}>
                <AppText variant="label" style={styles.fieldLabel}>Email address</AppText>
                <View style={[styles.emailField, { backgroundColor: t.bg, borderColor: error ? t.ember : emailFocused ? t.accent : t.line }]}>
                  <Icon name="mail" size={20} color={emailFocused ? t.accent : t.muted} />
                  <TextInput
                    value={email}
                    onChangeText={(value) => { setEmail(value); setError(null); }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    placeholder="you@example.com"
                    placeholderTextColor={t.muted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    textContentType="emailAddress"
                    autoComplete="email"
                    returnKeyType="send"
                    onSubmitEditing={submitEmail}
                    accessibilityLabel="Email address"
                    style={[styles.emailInput, { color: t.ink }]}
                  />
                </View>
                {error ? (
                  <Animated.View entering={FadeInDown.duration(300)}><AppText variant="small" color={t.ember} style={styles.formMessage}>{error}</AppText></Animated.View>
                ) : <AppText variant="caption" muted style={styles.formMessage}>New here? Your account is created automatically.</AppText>}
              </View>

              <View style={styles.actions}>
                <Button label={busy ? 'Sending code…' : 'Send my code'} disabled={!EMAIL_RE.test(email.trim()) || busy} onPress={submitEmail} />
                <AppText variant="caption" muted style={styles.footerNote}>No password to remember.</AppText>
              </View>
            </Animated.View>
          ) : (
            <Animated.View key="code" entering={FadeInRight.duration(380).easing(ease)} exiting={FadeOutLeft.duration(200)} style={styles.content}>
              <View style={styles.hero}>
                <View style={[styles.art, { backgroundColor: t.tint, borderColor: t.line }]}>
                  <Icon name="mail" size={40} color={t.accent} />
                  <View style={[styles.artDot, { backgroundColor: t.ember }]} />
                </View>
                <AppText variant="caption" color={t.accent} style={styles.eyebrow}>ONE MORE STEP</AppText>
                <WordReveal text="Check your inbox." style={styles.title} delay={80} />
                <AppText variant="body" muted style={styles.subtitle}>Enter the eight-digit code we sent to your email.</AppText>
                <View style={[styles.emailPill, { backgroundColor: t.tint }]}>
                  <Icon name="mail" size={15} color={t.accent} />
                  <AppText variant="small" color={t.accent} numberOfLines={1} style={styles.emailPillText}>{email.trim()}</AppText>
                </View>
              </View>

              <View style={[styles.formCard, surfaceElevation(t)]}>
                <AppText variant="label" style={styles.fieldLabel}>Verification code</AppText>
                <View style={styles.codeField}>
                  {Array.from({ length: 8 }, (_, index) => (
                    <View key={index} style={[styles.digitBox, index === 3 && styles.digitBreak, {
                      backgroundColor: code[index] ? t.tint : t.bg,
                      borderColor: error ? t.ember : codeFocused && index === Math.min(code.length, 7) ? t.accent : t.line,
                    }]}>
                      <AppText variant="medium" color={code[index] ? t.ink : t.muted} style={styles.digitText}>
                        {code[index] || (codeFocused && index === code.length ? '|' : '')}
                      </AppText>
                    </View>
                  ))}
                  <TextInput
                    ref={codeInput}
                    value={code}
                    onChangeText={(value) => { setCode(value.replace(/[^0-9]/g, '').slice(0, 8)); setError(null); }}
                    onFocus={() => setCodeFocused(true)}
                    onBlur={() => setCodeFocused(false)}
                    keyboardType="number-pad"
                    textContentType="oneTimeCode"
                    returnKeyType="done"
                    onSubmitEditing={submitCode}
                    accessibilityLabel="Eight-digit verification code"
                    style={styles.codeInput}
                  />
                </View>
                {error ? (
                  <Animated.View entering={FadeInDown.duration(300)}><AppText variant="small" color={t.ember} style={styles.formMessage}>{error}</AppText></Animated.View>
                ) : <AppText variant="caption" muted style={styles.formMessage}>{resent ? 'A fresh code is on its way.' : 'Tap the boxes to enter your code.'}</AppText>}
                <View style={styles.resendRow}>
                  <AppText variant="small" muted>Didn’t receive it?</AppText>
                  <PressableScale onPress={submitEmail} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy }}>
                    <AppText variant="small" color={t.accent} style={styles.resendText}>{busy ? 'Sending…' : 'Resend code'}</AppText>
                  </PressableScale>
                </View>
              </View>

              <View style={styles.actions}>
                <Button label={busy ? 'Verifying…' : 'Verify and continue'} disabled={code.length !== 8 || busy} onPress={submitCode} />
                <AppText variant="caption" muted style={styles.footerNote}>Your next step is waiting.</AppText>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  flex: { flex: 1 },
  topBloom: { top: -135, right: -150 },
  bottomBloom: { bottom: -115, left: -115 },
  scroll: { flexGrow: 1, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 20 },
  header: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  brandIcon: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  brandText: { fontSize: 12, letterSpacing: 1.5 },
  backLink: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 4 },
  stepBadge: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill },
  content: { flexGrow: 1, justifyContent: 'center', paddingTop: 16, paddingBottom: 8 },
  hero: { alignItems: 'flex-start' },
  art: { width: 112, height: 112, borderRadius: 35, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  artDot: { position: 'absolute', right: 28, top: 30, width: 8, height: 8, borderRadius: 4 },
  eyebrow: { letterSpacing: 1.5, fontSize: 11.5, marginBottom: 9 },
  title: { marginBottom: 11 },
  subtitle: { lineHeight: 23, maxWidth: 350 },
  emailPill: { maxWidth: '100%', flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, marginTop: 16 },
  emailPillText: { flexShrink: 1 },
  formCard: { borderRadius: radius.lg, padding: 18, marginTop: 30 },
  fieldLabel: { marginBottom: 11 },
  emailField: { height: 56, borderRadius: radius.md, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 15 },
  emailInput: { flex: 1, height: '100%', fontFamily: fonts.body, fontSize: 16, padding: 0 },
  formMessage: { marginTop: 11 },
  codeField: { height: 56, flexDirection: 'row', gap: 5, position: 'relative' },
  digitBox: { flex: 1, minWidth: 0, height: 54, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  digitBreak: { marginRight: 5 },
  digitText: { fontFamily: fonts.semibold, fontSize: 21 },
  codeInput: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.01, color: 'transparent' },
  resendRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5, marginTop: 20 },
  resendText: { fontFamily: fonts.semibold },
  actions: { marginTop: 24 },
  footerNote: { textAlign: 'center', marginTop: 15 },
});
