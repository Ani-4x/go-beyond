import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Returns a number that changes every time the screen regains focus (not on first mount).
 * Use it as a React `key` on the screen content so entrance animations replay on return.
 */
export function useReplayKey() {
  const [key, setKey] = useState(0);
  const first = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (first.current) {
        first.current = false;
        return;
      }
      setKey((k) => k + 1);
    }, []),
  );
  return key;
}

/** Counts from `from` to `target` with an ease-out curve. */
export function useCountUp(target: number, opts: { from?: number; delay?: number; duration?: number } = {}) {
  const { from = 0, delay = 0, duration = 700 } = opts;
  const [value, setValue] = useState(from);
  useEffect(() => {
    let raf = 0;
    const timer = setTimeout(() => {
      const t0 = Date.now();
      const step = () => {
        const p = Math.min(1, (Date.now() - t0) / duration);
        setValue(Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3))));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [target, from, delay, duration]);
  return value;
}

const seen = new Map<string, number>();

/**
 * Returns the value this key had the last time any screen saw it (or undefined the first time),
 * then remembers the new value. Lets a screen animate "from where you were last time".
 */
export function useSeen(key: string, value: number): number | undefined {
  const [prev] = useState(() => {
    const p = seen.get(key);
    seen.set(key, value);
    return p;
  });
  return prev;
}
