import React, { useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeInRight, FadeOutLeft } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { WordReveal } from '../components/StaggerIn';
import { useAuth } from '../state/auth';
import { ease } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, surfaceElevation } from '../theme/tokens';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Sign in with a one-time code, no password to remember. */
export function AuthScreen() {
  const t = useTheme();
  const { sendCode, verifyCode } = useAuth();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeInput = useRef<TextInput>(null);

  const submitEmail = async () => {
    if (!EMAIL_RE.test(email.trim()) || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await sendCode(email);
    setBusy(false);
    if (err) setError(err);
    else {
      setStep('code');
      setTimeout(() => codeInput.current?.focus(), 350);
    }
  };

  const submitCode = async () => {
    if (code.trim().length < 6 || busy) return;
    setBusy(true);
    setError(null);
    const { error: err } = await verifyCode(email, code);
    setBusy(false);
    if (err) setError(err);
    // On success, onAuthStateChange flips the app over automatically.
  };

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {step === 'email' ? (
          <Animated.View key="email" entering={FadeInRight.duration(380).easing(ease)} exiting={FadeOutLeft.duration(200)} style={styles.body}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <WordReveal text="Let's find your zone." />
              <AppText variant="small" muted style={{ marginTop: 12 }}>
                Enter your email and we'll send a one-time code. No password needed.
              </AppText>
              <TextInput
                value={email}
                onChangeText={(v) => {
                  setEmail(v);
                  setError(null);
                }}
                placeholder="you@example.com"
                placeholderTextColor={t.muted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={submitEmail}
                style={[styles.input, { backgroundColor: t.surface, borderColor: error ? t.ember : t.line, color: t.ink }]}
              />
              {error && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <AppText variant="small" color={t.ember} style={{ marginTop: -10, marginBottom: 4 }}>{error}</AppText>
                </Animated.View>
              )}
            </View>
            <Button label={busy ? 'Sending…' : 'Send code'} disabled={!EMAIL_RE.test(email.trim()) || busy} onPress={submitEmail} />
          </Animated.View>
        ) : (
          <Animated.View key="code" entering={FadeInRight.duration(380).easing(ease)} exiting={FadeOutLeft.duration(200)} style={styles.body}>
            <View style={{ flex: 1, justifyContent: 'center' }}>
              <PressableScale
                onPress={() => {
                  setStep('email');
                  setCode('');
                  setError(null);
                }}
                scaleTo={0.9}
                accessibilityLabel="Use a different email"
                style={[styles.back, surfaceElevation(t)]}
              >
                <Icon name="back" color={t.ink} />
              </PressableScale>
              <WordReveal text="Check your email." delay={80} />
              <AppText variant="small" muted style={{ marginTop: 12 }}>We sent a 6-digit code to {email}.</AppText>
              <TextInput
                ref={codeInput}
                value={code}
                onChangeText={(v) => {
                  setCode(v.replace(/[^0-9]/g, '').slice(0, 6));
                  setError(null);
                }}
                placeholder="000000"
                placeholderTextColor={t.muted}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
                returnKeyType="done"
                onSubmitEditing={submitCode}
                style={[styles.input, styles.code, { backgroundColor: t.surface, borderColor: error ? t.ember : t.line, color: t.ink }]}
              />
              {error && (
                <Animated.View entering={FadeInDown.duration(300)}>
                  <AppText variant="small" color={t.ember} style={{ marginTop: -10, marginBottom: 4 }}>{error}</AppText>
                </Animated.View>
              )}
              <PressableScale onPress={submitEmail} disabled={busy} scaleTo={0.96} style={{ marginTop: 4 }}>
                <AppText variant="small" muted>Didn't get it? Send again</AppText>
              </PressableScale>
            </View>
            <Button label={busy ? 'Checking…' : 'Verify'} disabled={code.length < 6 || busy} onPress={submitCode} />
          </Animated.View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 22, paddingBottom: 12 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  input: { height: 54, borderRadius: 18, borderWidth: 1.5, paddingHorizontal: 18, fontFamily: fonts.body, fontSize: 17, marginTop: 22 },
  code: { fontSize: 22, letterSpacing: 6, fontFamily: fonts.semibold },
});
