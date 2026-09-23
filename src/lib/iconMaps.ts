import type { DimIndex } from '../data/content';
import type { IconName } from '../components/Icons';

/** Icon for each of the six growth dimensions, in the same 0-5 order as DIMENSIONS. */
export const DIMENSION_ICON: Record<DimIndex, IconName> = {
  0: 'confidence',
  1: 'social',
  2: 'discipline',
  3: 'learning',
  4: 'experience',
  5: 'openness',
};

/** Icon for each moment category, keyed by its MOMENT_CATEGORIES key. */
export const MOMENT_ICON: Record<string, IconName> = {
  Reflect: 'reflect',
  Move: 'move',
  Connect: 'connect',
  Explore: 'explore',
  Build: 'build',
  Reset: 'reset',
};
