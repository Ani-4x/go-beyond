import { Easing } from 'react-native-reanimated';

/** Scenes and lists glide in with this curve. */
export const ease = Easing.bezier(0.2, 0.8, 0.2, 1);

/** Springs are for touch: quick, with a little bounce. */
export const spring = {
  snappy: { damping: 15, stiffness: 260, mass: 0.7 },
  bouncy: { damping: 11, stiffness: 170, mass: 0.9 },
  gentle: { damping: 18, stiffness: 110, mass: 1 },
  /** Slight overshoot, used when the zone stretches outward. */
  stretch: { damping: 11, stiffness: 70, mass: 1 },
} as const;

/** Delay for the nth item in a staggered entrance. */
export const stagger = (index: number, base = 70, step = 65) => base + index * step;
