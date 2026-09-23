import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/AppText';
import { Button } from '../components/Button';
import { GlowField } from '../components/GlowField';
import { Icon } from '../components/Icons';
import { PressableScale } from '../components/PressableScale';
import { Ripples } from '../components/Ripples';
import { StaggerIn } from '../components/StaggerIn';
import type { RootStackParamList } from '../navigation/types';
import { useToday } from '../state/store';
import { ease } from '../theme/motion';
import { gradients } from '../theme/tokens';

/** Act: a calm focus mode. No timer, no pressure. */
export function FocusScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Focus'>) {
  const info = useToday();
  if (!info) return null;

  return (
    <View style={styles.root}>
      <LinearGradient colors={gradients.cobalt} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <GlowField color="#B7A9FF" size={340} opacity={0.4} style={styles.glow} />
      <StatusBar style="light" />
      <Ripples size={320} style={{ right: -100, top: -60 }} />
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <View style={styles.body}>
          <StaggerIn index={0} style={styles.top}>
            <PressableScale onPress={() => navigation.goBack()} scaleTo={0.9} accessibilityLabel="Close" style={styles.close}>
              <Icon name="close" color="#fff" />
            </PressableScale>
            <AppText variant="medium" color="#fff">In progress</AppText>
          </StaggerIn>

          <StaggerIn index={1}>
            <AppText variant="display" color="#fff" style={styles.title}>{info.challenge.text}</AppText>
          </StaggerIn>

          {info.tips.map((tip, i) => (
            <Animated.View key={tip} entering={FadeInDown.delay(500 + i * 120).duration(500).easing(ease)} style={styles.tip}>
              <AppText variant="medium" color="#fff" style={{ fontSize: 15.5 }}>{tip}</AppText>
            </Animated.View>
          ))}

          <StaggerIn delay={900} style={{ marginTop: 14 }}>
            <AppText variant="small" color="rgba(255,255,255,0.8)">No timer. Take as long as you need.</AppText>
          </StaggerIn>
        </View>

        <Animated.View entering={FadeInDown.delay(350).duration(500).easing(ease)} style={styles.dock}>
          <Button variant="light" label="I did it" onPress={() => navigation.replace('Complete')} />
          <Button variant="ghost" color="#fff" label="Not today" onPress={() => navigation.goBack()} />
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  glow: { position: 'absolute', right: -110, top: -80 },
  body: { flex: 1, paddingHorizontal: 22, paddingTop: 18 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 30 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 34, lineHeight: 36, marginBottom: 26 },
  tip: {
    padding: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    marginBottom: 9,
  },
  dock: { paddingHorizontal: 22, paddingBottom: 12, paddingTop: 8 },
});
