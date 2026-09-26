import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spring } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { fonts, glowElevation } from '../theme/tokens';
import { AppText } from './AppText';
import { Icon, IconName } from './Icons';
import { PressableScale } from './PressableScale';

const ICONS: Record<string, IconName> = { Today: 'sunrise', Zone: 'rings', Journal: 'journal', Profile: 'account' };

function TabItem({ label, icon, focused, onPress }: { label: string; icon: IconName; focused: boolean; onPress: () => void }) {
  const t = useTheme();
  const a = useSharedValue(focused ? 1 : 0);
  const pop = useSharedValue(1);

  useEffect(() => {
    a.value = withSpring(focused ? 1 : 0, spring.bouncy);
    if (focused) pop.value = withSequence(withTiming(0.8, { duration: 70 }), withSpring(1, spring.bouncy));
  }, [focused, a, pop]);

  // The pill stretches out behind the active icon.
  const pill = useAnimatedStyle(() => ({ width: 32 + 28 * Math.max(0, a.value) }));
  const pillBg = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, a.value)) }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));

  return (
    <PressableScale
      onPress={onPress}
      scaleTo={0.92}
      style={styles.item}
      accessibilityRole="tab"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
    >
      <Animated.View style={[styles.pill, pill]}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.tint, borderRadius: 15 }, pillBg]} />
        <Animated.View style={iconStyle}>
          <Icon name={icon} color={focused ? t.accent : t.muted} />
        </Animated.View>
      </Animated.View>
      <AppText variant="caption" color={focused ? t.ink : t.muted} style={{ fontFamily: focused ? fonts.semibold : fonts.medium, fontSize: 11.5 }}>
        {label}
      </AppText>
    </PressableScale>
  );
}

/**
 * Docks flush with the bottom of the screen, with a frosted-glass background — matching the
 * reference design exactly rather than floating above the content.
 */
export function TabBar({ state, navigation }: BottomTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const isDark = t.scheme === 'dark';

  return (
    <View style={[styles.wrap, glowElevation('#0B1330', isDark ? 0.4 : 0.1)]}>
      <View style={[styles.bar, { paddingBottom: insets.bottom + 10 }]}>
        <BlurView intensity={isDark ? 36 : 68} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: isDark ? 'rgba(22,26,47,0.82)' : 'rgba(255,255,255,0.85)' },
          ]}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.topBorder,
            { borderColor: isDark ? 'rgba(255,255,255,0.09)' : 'rgba(108,92,231,0.12)' },
          ]}
        />
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          return (
            <TabItem
              key={route.key}
              label={route.name}
              icon={ICONS[route.name] ?? 'sunrise'}
              focused={focused}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  Haptics.selectionAsync().catch(() => {});
                  navigation.navigate(route.name, route.params);
                }
              }}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  bar: {
    flexDirection: 'row',
    paddingTop: 12,
    paddingHorizontal: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  topBorder: { borderTopWidth: 1 },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  pill: { height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
