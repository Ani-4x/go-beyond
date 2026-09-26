import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type TabParamList = {
  Today: undefined;
  Zone: undefined;
  Journal: { openCapture?: boolean } | undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Baseline: undefined;
  Reveal: undefined;
  Main: NavigatorScreenParams<TabParamList> | undefined;
  Focus: { itemId: string };
  Complete: { itemId: string };
};

/** Navigation prop for a tab screen that can also open root-stack screens. */
export type TabScreenNav<T extends keyof TabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;
