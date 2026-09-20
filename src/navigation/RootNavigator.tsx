import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DefaultTheme, NavigationContainer, Theme as NavTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect, useMemo } from 'react';
import { AppState } from 'react-native';
import { TabBar } from '../components/TabBar';
import { BaselineScreen } from '../screens/BaselineScreen';
import { CompleteScreen } from '../screens/CompleteScreen';
import { FocusScreen } from '../screens/FocusScreen';
import { JournalScreen } from '../screens/JournalScreen';
import { RevealScreen } from '../screens/RevealScreen';
import { TodayScreen } from '../screens/TodayScreen';
import { ZoneScreen } from '../screens/ZoneScreen';
import { useStore } from '../state/store';
import { useTheme } from '../theme/ThemeProvider';
import type { RootStackParamList, TabParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

function Tabs() {
  const t = useTheme();
  return (
    <Tab.Navigator
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false, animation: 'fade', sceneStyle: { backgroundColor: t.bg } }}
    >
      <Tab.Screen name="Today" component={TodayScreen} />
      <Tab.Screen name="Zone" component={ZoneScreen} />
      <Tab.Screen name="Journal" component={JournalScreen} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  const t = useTheme();
  const { state, ensureToday } = useStore();

  // Pick today's challenge once onboarding is done, and again whenever the app returns on a new day.
  useEffect(() => {
    if (state.ready && state.onboarded) ensureToday();
  }, [state.ready, state.onboarded, ensureToday]);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') ensureToday();
    });
    return () => sub.remove();
  }, [ensureToday]);

  const navTheme = useMemo<NavTheme>(
    () => ({
      ...DefaultTheme,
      dark: t.scheme === 'dark',
      colors: { ...DefaultTheme.colors, background: t.bg, card: t.surface, text: t.ink, border: t.line, primary: t.accent, notification: t.ember },
    }),
    [t],
  );

  if (!state.ready) return null;

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={t.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right', contentStyle: { backgroundColor: t.bg } }}>
        {!state.onboarded ? (
          <>
            <Stack.Screen name="Baseline" component={BaselineScreen} />
            <Stack.Screen name="Reveal" component={RevealScreen} options={{ gestureEnabled: false }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Main" component={Tabs} />
            <Stack.Screen name="Focus" component={FocusScreen} options={{ animation: 'fade_from_bottom' }} />
            <Stack.Screen name="Complete" component={CompleteScreen} options={{ animation: 'fade', gestureEnabled: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
