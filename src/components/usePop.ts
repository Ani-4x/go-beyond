import { useEffect, useRef } from 'react';
import { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';
import { spring } from '../theme/motion';

/** A little "pop" whenever `active` flips to true (not on first render). */
export function usePop(active: boolean) {
  const s = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (active) s.value = withSequence(withTiming(0.92, { duration: 70 }), withSpring(1, spring.bouncy));
  }, [active, s]);
  return useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
}
